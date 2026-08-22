import { claimNextJob, updateJobStatus } from "./claim";
import { TavilySearchProvider } from "../discovery/tavily";
import { rankSource } from "../discovery/ranking";
import { safeFetch } from "../collection/fetcher";
import { validatePdf } from "../collection/pdf";
import { extractHtmlText } from "../collection/html";
import { storeDocument } from "../collection/storage";
import { requireDb } from "@/db";
import { pipelineSources, pipelineDocuments, pipelineUniversities, pipelinePrograms } from "@/db/schema";
import { eq } from "drizzle-orm";

let searchProvider: TavilySearchProvider;
function getSearchProvider() {
  if (!searchProvider) {
    searchProvider = new TavilySearchProvider();
  }
  return searchProvider;
}

/**
 * Process a single claimed job.
 */
export async function processNextJob() {
  const job = await claimNextJob();
  if (!job) return false; // No job found

  const universityId = job.universityId;
  if (!universityId) {
    await updateJobStatus(job.id, 'failed', 'UNIVERSITY_NOT_FOUND');
    return true;
  }

  try {
    // Determine what step needs to be done based on status
    let currentStatus = job.status;
    if (currentStatus === 'pending' || currentStatus === 'failed') {
      currentStatus = 'searching';
      await updateJobStatus(job.id, 'searching');
    }

    // Load university details
    const [university] = await requireDb().select().from(pipelineUniversities).where(eq(pipelineUniversities.id, universityId));
    let program = null;
    if (job.programId) {
      const programs = await requireDb().select().from(pipelinePrograms).where(eq(pipelinePrograms.id, job.programId));
      program = programs[0];
    }

    if (!university) throw new Error("UNIVERSITY_NOT_FOUND");

    let discoveredSourceId: string | null = null;
    let documentHash: string | null = null;

    if (currentStatus === 'searching') {
      // 1. Perform discovery
      const query = program 
        ? `${university.universitySlug} ${program.canonicalName || program.specializationSlug} study plan curriculum pdf`
        : `${university.universitySlug} course catalog handbook pdf`;

      const results = await getSearchProvider().search(query, {
        limit: 5,
        includeDomains: university.officialDomain ? [university.officialDomain] : undefined
      });

      if (results.length === 0) {
        throw new Error("NO_SOURCES_FOUND");
      }

      // Rank results
      const ranked = results.map(r => rankSource(r.url, r.title, university.officialDomain));
      ranked.sort((a, b) => b.score - a.score);

      const bestSource = ranked[0];
      if (bestSource.score < 50) {
        throw new Error("NO_RELEVANT_SOURCES_FOUND");
      }

      // 2. Create source record
      const [newSource] = await requireDb().insert(pipelineSources).values({
        universityId: university.id,
        programId: program?.id ?? null,
        url: bestSource.url,
        domain: new URL(bestSource.url).hostname,
        sourceType: bestSource.category,
        title: bestSource.title,
        status: 'active',
        credibilityScore: bestSource.score,
      }).returning();

      discoveredSourceId = newSource.id;

      currentStatus = 'downloading';
      await updateJobStatus(job.id, 'downloading', null, { sourceId: discoveredSourceId });
    }

    if (currentStatus === 'downloading') {
      // Find the sourceId from metadata if resumed, or from previous step
      if (!discoveredSourceId) {
        const metadata = typeof job.metadata === "string" ? JSON.parse(job.metadata) : job.metadata;
        discoveredSourceId = metadata?.sourceId;
      }

      if (!discoveredSourceId) {
        throw new Error("STATE_ERROR: Missing sourceId for downloading phase");
      }

      const [source] = await requireDb().select().from(pipelineSources).where(eq(pipelineSources.id, discoveredSourceId));
      if (!source) throw new Error("SOURCE_NOT_FOUND");

      // Fetch the document
      const fetchResult = await safeFetch(source.url);

      // Validate PDF if applicable
      let parserUsed = "html";
      let pageCount = null;
      let extractedText = null;
      
      if (fetchResult.contentType?.includes("pdf") || source.url.toLowerCase().endsWith(".pdf")) {
        parserUsed = "pdf-parse";
        const pdfResult = await validatePdf(fetchResult.buffer);
        if (!pdfResult.isValid) {
          throw new Error(pdfResult.error || "INVALID_PDF");
        }
        pageCount = pdfResult.pageCount;
        extractedText = pdfResult.extractedText;
      } else if (fetchResult.contentType?.includes("html")) {
        parserUsed = "cheerio";
        const htmlResult = extractHtmlText(fetchResult.buffer);
        if (!htmlResult.extractedText || htmlResult.extractedText.length < 100) {
          throw new Error("EMPTY_HTML_CONTENT");
        }
        extractedText = htmlResult.extractedText;
      }

      documentHash = fetchResult.hash;

      // Check for duplicate document hash
      const existingDocs = await requireDb().select().from(pipelineDocuments).where(eq(pipelineDocuments.contentHash, documentHash)).limit(1);
      
      let blobPath = existingDocs[0]?.storagePath;

      if (!blobPath) {
        // Upload to Vercel Blob
        blobPath = await storeDocument(
          university.id, 
          program?.id ?? null, 
          documentHash, 
          fetchResult.buffer, 
          fetchResult.contentType || "application/octet-stream"
        );
      }

      // Create Document Record
      await requireDb().insert(pipelineDocuments).values({
        sourceId: source.id,
        url: fetchResult.url, // Might be different from source.url due to redirects
        storagePath: blobPath,
        mimeType: fetchResult.contentType,
        fileSize: fetchResult.contentLength,
        contentHash: documentHash,
        extractedText: extractedText,
        pageCount: pageCount,
        parser: parserUsed,
        status: 'completed',
        downloadedAt: new Date(),
        processedAt: new Date(),
      });

      await updateJobStatus(job.id, 'completed', null, { sourceId: source.id, documentHash });
    }

    return true;

  } catch (error: unknown) {
    console.error(`[Job ${job.id}] Failed:`, error);
    const message = error instanceof Error ? error.message : String(error);

    // Determine if error is permanent based on the new classification
    const isPermanent =
      message.includes("SSRF_BLOCKED") ||
      message.includes("INVALID_PDF") ||
      message.includes("EMPTY_HTML_CONTENT") ||
      message.includes("HTTP_404") ||
      message.includes("FILE_TOO_LARGE") ||
      message.includes("UNSUPPORTED_CONTENT_TYPE") ||
      message.includes("INVALID_URL") ||
      message.includes("NO_RELEVANT_SOURCES_FOUND") ||
      message.includes("NO_SOURCES_FOUND") ||
      message.includes("UNIVERSITY_NOT_FOUND");

    // Some errors like TLS_CERTIFICATE_ERROR should only be retried if we add an explicit policy,
    // but without an exception domain, retrying won't fix it. So it should probably be permanent unless configured.
    const isTls = message.includes("TLS_CERTIFICATE_ERROR");

    // Fail permanently if it's a permanent error, TLS error (because it won't fix itself), or we ran out of retries.
    if (isPermanent || isTls || job.retryCount >= job.maxRetries) {
      await updateJobStatus(job.id, 'failed', message);
    } else {
      // Revert status to failed so it can be retried by the claim logic
      await updateJobStatus(job.id, 'failed', message);
    }

    return true; // We processed a job, even if it failed
  }
}

import { claimNextJob, claimJobById, updateJobStatus, type PipelineCollectionJob } from "./claim";
import { TavilySearchProvider } from "../discovery/tavily";
import { rankSource } from "../discovery/ranking";
import { normalizeSourceUrl } from "../discovery/url-normalize";
import { safeFetch } from "../collection/fetcher";
import { validatePdf } from "../collection/pdf";
import { extractHtmlText } from "../collection/html";
import { storeDocument } from "../collection/storage";
import { requireDb } from "@/db";
import { pipelineSources, pipelineDocuments, pipelineUniversities, pipelinePrograms } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";

let searchProvider: TavilySearchProvider;
function getSearchProvider() {
  if (!searchProvider) {
    searchProvider = new TavilySearchProvider();
  }
  return searchProvider;
}

const SOURCE_UNIQUE_INDEX = "pipeline_source_one_active_per_target";

// Same rationale as isActiveClaimConflict (extraction/pipeline.ts):
// `instanceof NeonDbError` is unreliable across this codebase's CJS/ESM
// module-resolution boundary, so use the error's plain identity fields.
function isSourceUniqueConflict(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { name?: unknown }).name === "NeonDbError" &&
    (e as { code?: unknown }).code === "23505" &&
    (e as { constraint?: unknown }).constraint === SOURCE_UNIQUE_INDEX
  );
}

/**
 * Runs the actual discovery/collection work for an already-claimed job.
 * Shared by processNextJob() and processJobById() (Phase 3.5B-7B) so both
 * entry points guarantee identical behavior — this is the only place
 * discovery/collection logic is written.
 */
async function processClaimedJob(job: PipelineCollectionJob): Promise<void> {
  const universityId = job.universityId;
  if (!universityId) {
    await updateJobStatus(job.id, 'failed', 'UNIVERSITY_NOT_FOUND');
    return;
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
      const targetSpecialization = program ? (program.canonicalName || program.specializationSlug) : null;
      const ranked = results.map(r => rankSource(r.url, r.title, university.officialDomain, targetSpecialization));
      ranked.sort((a, b) => b.score - a.score);

      const bestSource = ranked[0];
      if (bestSource.score < 50) {
        throw new Error("NO_RELEVANT_SOURCES_FOUND");
      }

      // 2. Create source record — conflict-safe (Phase 3.5B-6B-1): a plain
      // INSERT first; if it conflicts on pipeline_source_one_active_per_target
      // (an ACTIVE source already exists for this exact (universityId,
      // programId, normalizedUrl) target — e.g. this exact job retrying, or
      // a concurrent discovery for the same target), fall back to looking
      // up and reusing that existing row instead of creating a duplicate.
      // Raw SQL, not Drizzle's onConflictDoNothing builder: the target
      // index is partial (WHERE status='active') and uses a COALESCE
      // expression column, and Postgres only applies ON CONFLICT inference
      // to a partial index when the ON CONFLICT clause's own WHERE
      // predicate matches it exactly — the plain-insert-then-catch pattern
      // (already proven in Phase 3.5B-3B/3.5B-4) sidesteps that entirely.
      // pipelineSources.id has no DB-level default (only Drizzle's
      // $defaultFn, which never fires for raw sql), so the id is generated
      // explicitly here.
      const normalizedUrl = normalizeSourceUrl(bestSource.url);
      const newSourceId = crypto.randomUUID();
      let sourceId: string;
      try {
        const result = await requireDb().execute(sql`
          INSERT INTO "pipeline_source" ("id", "universityId", "programId", "url", "normalizedUrl", "domain", "sourceType", "title", "status", "credibilityScore")
          VALUES (${newSourceId}, ${university.id}, ${program?.id ?? null}, ${bestSource.url}, ${normalizedUrl}, ${new URL(bestSource.url).hostname}, ${bestSource.category}, ${bestSource.title}, 'active', ${bestSource.score})
          RETURNING "id"
        `);
        sourceId = (result.rows[0] as { id: string }).id;
      } catch (e: unknown) {
        if (!isSourceUniqueConflict(e)) throw e;
        // Lost the conflict: an active source for this exact target already
        // exists. The DB constraint has already resolved identity
        // atomically above — this SELECT only retrieves the winning row's
        // id, it is not the dedup mechanism itself.
        const [existing] = await requireDb()
          .select({ id: pipelineSources.id })
          .from(pipelineSources)
          .where(
            and(
              eq(pipelineSources.universityId, university.id),
              program?.id ? eq(pipelineSources.programId, program.id) : isNull(pipelineSources.programId),
              eq(pipelineSources.normalizedUrl, normalizedUrl),
              eq(pipelineSources.status, "active")
            )
          )
          .limit(1);
        if (!existing) throw new Error("SOURCE_CONFLICT_LOOKUP_FAILED");
        sourceId = existing.id;
      }

      discoveredSourceId = sourceId;

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

      // Storage-path reuse ONLY — this is a global (unscoped) lookup and
      // must never be treated as document identity. It exists purely so
      // that bytes another source already stored aren't re-uploaded to
      // Blob. Document row identity is (sourceId, contentHash), enforced
      // below by the DB unique index, not by this lookup.
      const existingByHash = await requireDb()
        .select({ storagePath: pipelineDocuments.storagePath })
        .from(pipelineDocuments)
        .where(eq(pipelineDocuments.contentHash, documentHash))
        .limit(1);

      let blobPath = existingByHash[0]?.storagePath;

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

      // Phase 3.5B-6B-2: document identity for the SAME source is
      // authoritatively enforced by the pipeline_document_source_content_hash_unique
      // DB index on (sourceId, contentHash) — not by a check-then-act
      // SELECT. If identical bytes were already collected for this exact
      // source (sequential retry or concurrent collection), the INSERT
      // loses the conflict and no new row is created. This is what keeps
      // duplicate collection of unchanged content from producing a second
      // documentId — which would otherwise be independently eligible for
      // Phase 3.5B-4's per-documentId extraction claim (duplicate paid AI
      // calls on identical content).
      const [insertedDoc] = await requireDb()
        .insert(pipelineDocuments)
        .values({
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
        })
        .onConflictDoNothing({
          target: [pipelineDocuments.sourceId, pipelineDocuments.contentHash],
        })
        .returning({ id: pipelineDocuments.id });

      let documentId: string;
      if (insertedDoc) {
        documentId = insertedDoc.id;
      } else {
        // Lost the (sourceId, contentHash) conflict: an identical document
        // for this exact source already exists. The DB constraint already
        // resolved identity atomically above — this SELECT only retrieves
        // the winning row's id, it is not the dedup mechanism itself.
        const [existingDoc] = await requireDb()
          .select({ id: pipelineDocuments.id })
          .from(pipelineDocuments)
          .where(
            and(
              eq(pipelineDocuments.sourceId, source.id),
              eq(pipelineDocuments.contentHash, documentHash)
            )
          )
          .limit(1);
        if (!existingDoc) {
          throw new Error("DOCUMENT_CONFLICT_LOOKUP_FAILED");
        }
        documentId = existingDoc.id;
      }

      await updateJobStatus(job.id, 'completed', null, { sourceId: source.id, documentHash, documentId });
    }

    return;

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
  }
}

/**
 * Process a single claimed job — claims whatever is next system-wide
 * (highest priority, then oldest scheduledAt; see claimNextJob() in
 * claim.ts). Unchanged behavior/signature from before Phase 3.5B-7B.
 */
export async function processNextJob(): Promise<boolean> {
  const job = await claimNextJob();
  if (!job) return false; // No job found
  await processClaimedJob(job);
  return true;
}

/**
 * Phase 3.5B-7B (Controlled Live Pilot targeted processing): claims and
 * processes exactly ONE specific job by id via claimJobById() — same
 * eligibility rules as processNextJob()'s global claim (claim.ts's shared
 * claimEligibilityPredicate() is the single source of truth for both), and
 * the identical processClaimedJob() core, so discovery/collection behavior,
 * retry/failure classification, and metadata handling are guaranteed
 * identical to the global path — there is no second, independently-written
 * processing path to drift out of sync.
 *
 * Returns false if the requested job could not be claimed (already
 * claimed/in-flight, or ineligible — terminal, retries exhausted, or a
 * fresh non-stale in-flight job) rather than silently falling back to
 * claiming a different job. Never touches any job other than jobId.
 */
export async function processJobById(jobId: string): Promise<boolean> {
  const job = await claimJobById(jobId);
  if (!job) return false;
  await processClaimedJob(job);
  return true;
}

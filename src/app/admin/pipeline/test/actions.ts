"use server";

import { requireDb } from "@/db";
import { pipelineUniversities, pipelinePrograms } from "@/db/schema";
import { TavilySearchProvider } from "@/lib/curriculum/discovery/tavily";
import { rankSource } from "@/lib/curriculum/discovery/ranking";
import { processNextJob } from "@/lib/curriculum/jobs/process";
import { runExtractionForPendingDocuments, ExtractionBatchResult } from "@/lib/curriculum/extraction/batch";
import { eq } from "drizzle-orm";

export async function fetchUniversities() {
  return await requireDb().select().from(pipelineUniversities);
}

export async function fetchPrograms(universityId: string) {
  return await requireDb().select().from(pipelinePrograms).where(eq(pipelinePrograms.universityId, universityId));
}

export async function discoverSources(universityId: string, programId: string | null) {
  const [university] = await requireDb().select().from(pipelineUniversities).where(eq(pipelineUniversities.id, universityId));
  if (!university) throw new Error("University not found");

  let query = `${university.universitySlug} course catalog handbook pdf`;
  if (programId) {
    const [program] = await requireDb().select().from(pipelinePrograms).where(eq(pipelinePrograms.id, programId));
    if (program) {
      query = `${university.universitySlug} ${program.canonicalName || program.specializationSlug} study plan curriculum pdf`;
    }
  }

  const provider = new TavilySearchProvider();
  const results = await provider.search(query, {
    limit: 5,
    includeDomains: university.officialDomain ? [university.officialDomain] : undefined
  });

  const ranked = results.map(r => rankSource(r.url, r.title, university.officialDomain));
  ranked.sort((a, b) => b.score - a.score);

  return ranked;
}

// Manual trigger for the discovery -> collection stage. There is no cron
// or automated scheduler for this pipeline (deliberately, for now) — an
// admin advances it by hand from this page. Capped well under typical
// serverless function time limits since each job does a network fetch.
const MAX_COLLECTION_JOBS_PER_CLICK = 5;

export async function runCollectionBatch(): Promise<{ processed: number }> {
  let processed = 0;
  while (processed < MAX_COLLECTION_JOBS_PER_CLICK) {
    const didWork = await processNextJob();
    if (!didWork) break;
    processed++;
  }
  return { processed };
}

// Manual trigger for the extraction stage (AI call + persistence) on
// documents that were already collected but never successfully extracted.
const MAX_EXTRACTIONS_PER_CLICK = 3;

export async function runExtractionBatch(): Promise<{
  processed: number;
  results: ExtractionBatchResult[];
}> {
  return await runExtractionForPendingDocuments(MAX_EXTRACTIONS_PER_CLICK);
}

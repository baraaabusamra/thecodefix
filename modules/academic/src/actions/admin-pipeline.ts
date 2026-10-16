"use server";

import { requireDb } from "@tcf/db";
import { pipelineUniversities, pipelinePrograms } from "@tcf/db/schema";
import { TavilySearchProvider } from "../pipeline/discovery/tavily";
import { rankSource } from "../pipeline/discovery/ranking";
import { processNextJob, processJobById } from "../pipeline/jobs/process";
import { enqueueCollectionJob as enqueueCollectionJobLib, EnqueueResult } from "../pipeline/jobs/enqueue";
import { runExtractionForPendingDocuments, ExtractionBatchResult } from "../pipeline/extraction/batch";
import { eq } from "drizzle-orm";
import { requireCapability } from "@tcf/identity/authorization";
import { assertCurriculumExtractionEnabled } from "@tcf/core/flags";

// Server Actions are public endpoints — re-verify capability before any work.
// Matches this page's own gate (see page.tsx: "settings:manage as a proxy
// for superadmin/dev access") since the page-level check alone does not
// protect the actions themselves.
async function assertPipelineTestAccess() {
  await requireCapability("settings:manage");
}

export async function fetchUniversities() {
  await assertPipelineTestAccess();
  return await requireDb().select().from(pipelineUniversities);
}

export async function fetchPrograms(universityId: string) {
  await assertPipelineTestAccess();
  return await requireDb().select().from(pipelinePrograms).where(eq(pipelinePrograms.universityId, universityId));
}

export async function discoverSources(universityId: string, programId: string | null) {
  await assertPipelineTestAccess();
  const [university] = await requireDb().select().from(pipelineUniversities).where(eq(pipelineUniversities.id, universityId));
  if (!university) throw new Error("University not found");

  let query = `${university.universitySlug} course catalog handbook pdf`;
  let targetSpecialization: string | null = null;
  if (programId) {
    const [program] = await requireDb().select().from(pipelinePrograms).where(eq(pipelinePrograms.id, programId));
    if (program) {
      targetSpecialization = program.canonicalName || program.specializationSlug;
      query = `${university.universitySlug} ${targetSpecialization} study plan curriculum pdf`;
    }
  }

  const provider = new TavilySearchProvider();
  const results = await provider.search(query, {
    limit: 5,
    includeDomains: university.officialDomain ? [university.officialDomain] : undefined
  });

  const ranked = results.map(r => rankSource(r.url, r.title, university.officialDomain, targetSpecialization));
  ranked.sort((a, b) => b.score - a.score);

  return ranked;
}

// Phase 3.5B-7: the only supported way to put a new pending job into the
// queue for a given university/program — no other code path inserts
// pipeline_collection_job rows (Controlled Live Pilot Stage 1 found this
// gap: it could process/extract an existing queue, but nothing could add
// to it). Only creates/reuses the queue row itself — never touches
// pipeline_source, pipeline_document, extraction, or review tables. See
// src/lib/curriculum/jobs/enqueue.ts for the concurrency-safe
// insert-then-catch-conflict implementation.
export async function enqueueCollectionJob(
  universityId: string,
  programId: string | null
): Promise<EnqueueResult> {
  await assertPipelineTestAccess();
  return await enqueueCollectionJobLib(universityId, programId);
}

// Manual trigger for the discovery -> collection stage. There is no cron
// or automated scheduler for this pipeline (deliberately, for now) — an
// admin advances it by hand from this page. Capped well under typical
// serverless function time limits since each job does a network fetch.
const MAX_COLLECTION_JOBS_PER_CLICK = 5;

export async function runCollectionBatch(): Promise<{ processed: number }> {
  await assertPipelineTestAccess();
  let processed = 0;
  while (processed < MAX_COLLECTION_JOBS_PER_CLICK) {
    const didWork = await processNextJob();
    if (!didWork) break;
    processed++;
  }
  return { processed };
}

// Phase 3.5B-7B (Controlled Live Pilot targeted processing): claims and
// processes exactly ONE specific job by id, never a different one — needed
// because runCollectionBatch()/processNextJob() always claim system-wide by
// priority/age, which cannot guarantee a specific already-enqueued pilot job
// gets processed instead of an older, unrelated, still retry-eligible job
// elsewhere in the queue. Same discovery/collection logic and eligibility
// rules as the batch path (see processJobById() in jobs/process.ts) — this
// is a different entry point, not a second implementation.
export async function runCollectionJob(jobId: string): Promise<{ processed: boolean }> {
  await assertPipelineTestAccess();
  const processed = await processJobById(jobId);
  return { processed };
}

// Manual trigger for the extraction stage (AI call + persistence) on
// documents that were already collected but never successfully extracted.
const MAX_EXTRACTIONS_PER_CLICK = 3;

export async function runExtractionBatch(): Promise<{
  processed: number;
  results: ExtractionBatchResult[];
}> {
  // Authorize first, then disclose/inspect feature state. The batch and the
  // provider path repeat this gate as defense in depth.
  await assertPipelineTestAccess();
  assertCurriculumExtractionEnabled();
  return await runExtractionForPendingDocuments(MAX_EXTRACTIONS_PER_CLICK);
}

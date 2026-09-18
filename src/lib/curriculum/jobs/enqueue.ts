import { requireDb } from "@/db";
import { eq, and, isNull, sql } from "drizzle-orm";
import { pipelineCollectionJobs, pipelineUniversities, pipelinePrograms } from "@/db/schema";
import type { PipelineJobStatus } from "./claim";
import { isUniqueViolation } from "@/lib/db-errors";

// Phase 3.5B-7: the partial unique index enforcing "at most one active
// collection job per (universityId, COALESCE(programId, '')) target" — see
// src/db/schema.ts, pipelineCollectionJobs.
const ACTIVE_JOB_INDEX = "pipeline_collection_job_one_active_per_target";

// Mirrors the index's own active predicate exactly (schema.ts): the five
// in-flight statuses claimNextJob() (jobs/claim.ts) can select once stale
// (or while a worker currently holds them) — regardless of staleness, a job
// in one of these is still this target's job, not grounds for a second
// competing one — OR 'failed' while retries remain. 'completed' and
// 'cancelled' are excluded, and so are 'source_found' and 'needs_review':
// both are defined in the pipeline_job_status enum but never produced by
// process.ts and never matched by claimNextJob()'s own WHERE clause, so a
// job stuck in either is exactly as unreachable to the processor as
// 'completed' is.
export function isActiveJobStatus(status: PipelineJobStatus, retryCount: number, maxRetries: number): boolean {
  if (status === "pending" || status === "searching" || status === "downloading" ||
      status === "parsing" || status === "extracting" || status === "validating") {
    return true;
  }
  return status === "failed" && retryCount < maxRetries;
}

// Same rationale as isSourceUniqueConflict (jobs/process.ts) and
// isActiveClaimConflict (extraction/pipeline.ts): match the SQLSTATE and
// constraint on the error or its cause, never the driver class/name.
function isActiveJobConflict(e: unknown): boolean {
  // Driver/wrapper-agnostic (drizzle wraps driver errors; see db-errors.ts).
  return isUniqueViolation(e, ACTIVE_JOB_INDEX);
}

export class EnqueueValidationError extends Error {}

export interface EnqueueResult {
  jobId: string;
  /** false when an existing active job was reused instead of creating a new one. */
  created: boolean;
}

/**
 * Enqueues exactly one pending collection job for (universityId, programId).
 * programId may be null for a university-level job.
 *
 * Idempotent and concurrency-safe: if an active job already exists for this
 * exact target, returns that job's id instead of creating a duplicate. The
 * DB partial unique index is the concurrency authority (not a check-then-act
 * SELECT) — same insert-then-catch-conflict pattern already proven for
 * source, document, and extraction-claim dedup elsewhere in this codebase.
 *
 * Only ever touches pipeline_collection_job. Never creates a
 * pipeline_source, pipeline_document, extraction run, or review-queue row —
 * this is the queue entry only; claimNextJob()/processNextJob() do the
 * actual discovery/collection work later, separately.
 */
export async function enqueueCollectionJob(
  universityId: string,
  programId: string | null
): Promise<EnqueueResult> {
  const db = requireDb();

  const [university] = await db
    .select({ id: pipelineUniversities.id })
    .from(pipelineUniversities)
    .where(eq(pipelineUniversities.id, universityId));
  if (!university) throw new EnqueueValidationError("UNIVERSITY_NOT_FOUND");

  if (programId) {
    const [program] = await db
      .select({ id: pipelinePrograms.id, universityId: pipelinePrograms.universityId })
      .from(pipelinePrograms)
      .where(eq(pipelinePrograms.id, programId));
    if (!program) throw new EnqueueValidationError("PROGRAM_NOT_FOUND");
    if (program.universityId !== universityId) {
      throw new EnqueueValidationError("PROGRAM_UNIVERSITY_MISMATCH");
    }
  }

  const newJobId = crypto.randomUUID();
  try {
    // Only universityId/programId are set explicitly — status, retryCount,
    // maxRetries, and scheduledAt all have real DB-level defaults (not
    // Drizzle's client-only $defaultFn), so a plain raw INSERT naturally
    // produces a normal 'pending' queue row. Raw SQL, not the query
    // builder's .insert().onConflictDoNothing(): the target index is
    // partial with a COALESCE-expression column, and Postgres only applies
    // ON CONFLICT inference to a partial index when the ON CONFLICT
    // clause's own WHERE predicate matches it exactly — the same
    // constraint already documented at the source-insert call site in
    // jobs/process.ts, and the same reason that insert also uses raw SQL.
    const result = await db.execute(sql`
      INSERT INTO "pipeline_collection_job" ("id", "universityId", "programId")
      VALUES (${newJobId}, ${universityId}, ${programId})
      RETURNING "id"
    `);
    return { jobId: (result.rows[0] as { id: string }).id, created: true };
  } catch (e: unknown) {
    if (!isActiveJobConflict(e)) throw e;
    // Lost the conflict: an active job for this exact target already
    // exists. The DB constraint has already resolved identity atomically
    // above — this SELECT (a plain fetch of every job for the target,
    // filtered down to the active one in JS via isActiveJobStatus, the
    // same predicate the index itself enforces) only retrieves the
    // winning row's id, it is not the dedup mechanism itself.
    const candidates = await db
      .select({
        id: pipelineCollectionJobs.id,
        status: pipelineCollectionJobs.status,
        retryCount: pipelineCollectionJobs.retryCount,
        maxRetries: pipelineCollectionJobs.maxRetries,
      })
      .from(pipelineCollectionJobs)
      .where(
        and(
          eq(pipelineCollectionJobs.universityId, universityId),
          programId
            ? eq(pipelineCollectionJobs.programId, programId)
            : isNull(pipelineCollectionJobs.programId)
        )
      );
    const existing = candidates.find((row) => isActiveJobStatus(row.status, row.retryCount, row.maxRetries));
    if (!existing) throw new Error("ACTIVE_JOB_CONFLICT_LOOKUP_FAILED");
    return { jobId: existing.id, created: false };
  }
}

import { requireDb } from "@/db";
import { sql, type InferSelectModel } from "drizzle-orm";
import type { pipelineCollectionJobs } from "@/db/schema";

export type PipelineCollectionJob = InferSelectModel<typeof pipelineCollectionJobs>;

export type PipelineJobStatus = 
  | "pending"
  | "searching"
  | "source_found"
  | "downloading"
  | "parsing"
  | "extracting"
  | "validating"
  | "completed"
  | "needs_review"
  | "failed"
  | "cancelled";

// Phase 3.5B-7B: single source of truth for "can this job still be claimed"
// — shared by claimNextJob() (system-wide, priority/age ordered) and
// claimJobById() (Controlled Live Pilot's targeted claim). Duplicating this
// predicate across two hand-written queries was the exact risk flagged when
// the targeted path was requested: any future change to retry/stale
// semantics would need to be made twice, and could silently drift. Eligible:
// 1. pending
// 2. failed (ready for retry)
// 3. stale (stuck in a processing state for more than 15 minutes)
// ...always AND'd with retryCount < maxRetries — a job that has exhausted
// its retries is never claimable regardless of status.
function claimEligibilityPredicate() {
  return sql`
    (
      "status" = 'pending'
      OR "status" = 'failed'
      OR (
        "status" IN ('searching', 'downloading', 'parsing', 'extracting', 'validating')
        AND "startedAt" < NOW() - INTERVAL '15 minutes'
      )
    )
    AND "retryCount" < "maxRetries"
  `;
}

/**
 * Safely claims a single job using Postgres row-level locking (FOR UPDATE SKIP LOCKED).
 * This ensures multiple concurrent workers will never process the same job.
 *
 * See claimEligibilityPredicate() for exactly which jobs are eligible.
 */
export async function claimNextJob() {
  // Using raw SQL for the atomic UPDATE with SKIP LOCKED subquery.
  // We update startedAt to NOW() so it immediately resets the stale timer.
  const result = await requireDb().execute(sql`
    UPDATE "pipeline_collection_job"
    SET
      "startedAt" = NOW(),
      "retryCount" = CASE
         WHEN "status" != 'pending' THEN "retryCount" + 1
         ELSE "retryCount"
      END
    WHERE "id" = (
      SELECT "id"
      FROM "pipeline_collection_job"
      WHERE ${claimEligibilityPredicate()}
      ORDER BY "priority" DESC, "scheduledAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *;
  `);

  if (result.rows.length === 0) {
    return null;
  }

  // Cast to our expected shape
  return result.rows[0] as unknown as PipelineCollectionJob;
}

/**
 * Phase 3.5B-7B (Controlled Live Pilot): claims exactly ONE specific job by
 * id, using the identical eligibility rules and atomic UPDATE...RETURNING
 * pattern as claimNextJob() (claimEligibilityPredicate() above is the single
 * shared source of truth for both) — the only difference is the additional
 * `"id" = ${jobId}` filter, so ordering by priority/scheduledAt is moot (at
 * most one row can ever match a primary key).
 *
 * Knowing a job's id is NOT sufficient to claim it: a terminal job
 * (completed/cancelled/retries-exhausted-failed) or a fresh (non-stale)
 * in-flight job is just as ineligible here as it is for claimNextJob() — the
 * same DB-authoritative WHERE clause arbitrates both. FOR UPDATE SKIP LOCKED
 * means a second concurrent caller targeting the same id while a first
 * caller's claim is still in flight gets 0 rows back (already claimed), not
 * a race.
 */
export async function claimJobById(jobId: string) {
  const result = await requireDb().execute(sql`
    UPDATE "pipeline_collection_job"
    SET
      "startedAt" = NOW(),
      "retryCount" = CASE
         WHEN "status" != 'pending' THEN "retryCount" + 1
         ELSE "retryCount"
      END
    WHERE "id" = (
      SELECT "id"
      FROM "pipeline_collection_job"
      WHERE "id" = ${jobId} AND ${claimEligibilityPredicate()}
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING *;
  `);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as unknown as PipelineCollectionJob;
}

/**
 * Updates a job's status. To be called outside of the claiming transaction.
 *
 * Phase 3.5B-6B-1 (root cause of duplicate pipelineSources rows): `metadata`
 * must default to `undefined`, NOT `null`. A caller that omits `metadata`
 * (every failure-path call in process.ts's catch block) means "leave it
 * alone" — but `null` is `!== undefined`, so the old `= null` default made
 * every omitted-metadata call below unconditionally overwrite existing
 * metadata (including a previously-recorded sourceId) with the literal
 * string "null". The next claim of that job then fell back to `'searching'`
 * with no known sourceId, re-ran discovery, and blindly inserted a new
 * pipelineSources row — confirmed live: 100% of then-failed jobs had
 * metadata = 'null'. An explicit `metadata: null` argument (no current
 * caller does this) still means "clear it" — only omission now means
 * "preserve".
 */
export async function updateJobStatus(jobId: string, status: PipelineJobStatus, error: string | null = null, metadata?: Record<string, unknown> | null) {
  let updateSql = sql`
    UPDATE "pipeline_collection_job"
    SET "status" = ${status}::"pipeline_job_status"
  `;

  if (status === 'completed' || status === 'needs_review' || status === 'failed' || status === 'cancelled') {
    updateSql = sql`${updateSql}, "completedAt" = NOW()`;
  }

  if (error !== undefined) {
    updateSql = sql`${updateSql}, "error" = ${error}`;
  }

  if (metadata !== undefined) {
    updateSql = sql`${updateSql}, "metadata" = ${JSON.stringify(metadata)}`;
  }

  updateSql = sql`${updateSql} WHERE "id" = ${jobId}`;

  await requireDb().execute(updateSql);
}

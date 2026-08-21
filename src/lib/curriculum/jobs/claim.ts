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

/**
 * Safely claims a single job using Postgres row-level locking (FOR UPDATE SKIP LOCKED).
 * This ensures multiple concurrent workers will never process the same job.
 * 
 * It claims jobs that are:
 * 1. pending
 * 2. failed (ready for retry)
 * 3. stale (stuck in a processing state for more than 15 minutes)
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
      WHERE 
        (
          "status" = 'pending' 
          OR "status" = 'failed' 
          OR (
            "status" IN ('searching', 'downloading', 'parsing', 'extracting', 'validating') 
            AND "startedAt" < NOW() - INTERVAL '15 minutes'
          )
        )
        AND "retryCount" < "maxRetries"
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
 * Updates a job's status. To be called outside of the claiming transaction.
 */
export async function updateJobStatus(jobId: string, status: PipelineJobStatus, error: string | null = null, metadata: Record<string, unknown> | null = null) {
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

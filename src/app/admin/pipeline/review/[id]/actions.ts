"use server";

import { requireDb } from "@/db";
import { eq, sql } from "drizzle-orm";
import { pipelineReviewQueue, pipelineCurriculumVersions, auditLogs } from "@/db/schema";
import { prepareCurriculumPublish } from "@/lib/curriculum/extraction/compiler";
import { revalidatePath } from "next/cache";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { auth } from "@/auth";

// Phase 3.5B-3B: the partial unique index enforcing "at most one approved
// version per program" (src/db/schema.ts, pipelineCurriculumVersions).
// Matched against a caught write failure's .code/.constraint to distinguish
// the one EXPECTED concurrency conflict from every other kind of DB error.
const ONE_APPROVED_PER_PROGRAM_INDEX = "pipeline_curriculum_version_one_approved_per_program";

// db.execute() throws whatever @neondatabase/serverless's neon-http client
// throws, unwrapped (neither drizzle-orm's neon-http session nor this app
// catches/wraps it) — a real NeonDbError instance. `instanceof NeonDbError`
// is NOT reliable here, though: this file's ESM import of
// @neondatabase/serverless and the driver's own (CJS-resolved) reference to
// the same package can end up as two distinct class objects under Node's
// dual CJS/ESM module resolution, so an error thrown from "the other copy"
// fails `instanceof` even though it genuinely is a NeonDbError (verified
// directly — not assumed). `.name` is a plain string field the constructor
// sets unconditionally, unaffected by which copy constructed the instance,
// so check that instead of the class identity.
function isUniqueViolation(e: unknown, constraintName: string): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { name?: unknown }).name === "NeonDbError" &&
    (e as { code?: unknown }).code === "23505" &&
    (e as { constraint?: unknown }).constraint === constraintName
  );
}

// Server Actions are public endpoints — re-verify capability before any
// mutation. Mirrors assertReports() in src/lib/admin-reports.ts: resolveAdmin()
// for the RBAC/token gate, then auth() separately for the actual user id to
// attribute the review to (null in ADMIN_TOKEN fallback mode, where there is
// no user row).
async function assertReviewAccess() {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "content:edit")) {
    throw new Error("Forbidden");
  }
  const session = await auth();
  return { access, userId: session?.user?.id ?? null };
}

export async function approveReview(queueId: string, versionId: string) {
  const { userId } = await assertReviewAccess();
  const db = requireDb();

  const [queueItem] = await db.select().from(pipelineReviewQueue).where(eq(pipelineReviewQueue.id, queueId));
  if (!queueItem) throw new Error("Review item not found");
  if (queueItem.status !== "pending") throw new Error("Review item is not pending");
  // Never trust the client-supplied versionId for the mutation itself — only
  // use it to confirm it matches what the queue item actually references.
  const targetVersionId = queueItem.curriculumVersionId;
  if (!targetVersionId || targetVersionId !== versionId) {
    throw new Error("Version mismatch");
  }

  // Needed to scope sibling deprecation below to this version's own program.
  const [versionRow] = await db.select().from(pipelineCurriculumVersions).where(eq(pipelineCurriculumVersions.id, targetVersionId));
  if (!versionRow) throw new Error("Curriculum version not found");

  const now = new Date();
  const meta = JSON.stringify({
    versionId: targetVersionId,
    previousStatus: "pending",
    newStatus: "approved",
    programId: versionRow.programId,
  });
  // audit_log.id has no database-level default — pipelineExtractionRuns
  // and every other table's id is generated via Drizzle's $defaultFn(),
  // which only runs inside the query builder (db.insert(...).values(...)),
  // never for a raw sql`...` INSERT like the one below. Must be supplied
  // explicitly here, or this INSERT throws a NOT NULL violation and the
  // whole statement rolls back (verified directly against Postgres).
  const auditId = crypto.randomUUID();

  // Concurrency + atomicity together, in one Postgres statement: a writable
  // CTE chain. db.batch() (Phase 3.5A) makes this request's own writes
  // atomic with respect to ITS OWN partial failure, but it cannot make the
  // pending-check itself a lock — two concurrent requests can both pass the
  // pre-read above and both submit a batch that unconditionally matches
  // `WHERE id = queueId`. The CAS condition (`status = 'pending'`) must live
  // in the actual mutating statement, not in a prior read.
  //
  // Why not "conditional UPDATE...RETURNING, then check, then db.batch()"?
  // That would reintroduce the exact poison state Phase 3.5A/3.5B-1
  // eliminated: if the first (queue) write commits but the second
  // (version/audit) call then fails, the queue is no longer pending and
  // normal retry is blocked. A single statement doesn't have that gap —
  // Postgres guarantees one statement is all-or-nothing on its own, with no
  // dependency on db.batch()'s multi-statement transaction semantics.
  //
  // The mechanism: `claimed` only returns a row if this call actually
  // transitioned the queue from pending. Every dependent CTE/INSERT below
  // reads FROM `claimed` (directly or transitively) — if `claimed` is
  // empty, every later CTE and the final audit INSERT all naturally affect
  // zero rows, with no application-level branching required. This is
  // provable from Postgres's own CTE execution model, not merely intended.
  //
  // Phase 3.5B-3B (P1-D2): a second Postgres guarantee stacks on top of the
  // above — pipelineCurriculumVersions now has a partial unique index,
  // "at most one approved row per programId" (src/db/schema.ts). That
  // index forced a reordering here: sibling deprecation MUST commit before
  // this version is written to 'approved', or the index rejects the write
  // (the old sibling's row is still live as 'approved' at that instant).
  // Simple textual reordering isn't enough — Postgres does not guarantee
  // the relative execution order of sibling data-modifying CTEs unless one
  // genuinely reads the other's RETURNING output (see "Data-Modifying
  // Statements in WITH" in the Postgres docs). So the chain below is a
  // real, forced dependency graph, not just reordered text:
  //   claimed → target_program (SELECT, depends on claimed)
  //           → deprecated_siblings (UPDATE, depends on target_program)
  //           → target_version (UPDATE, depends on target_program AND
  //             reads deprecated_siblings — the "id" NOT IN clause below
  //             is always true in practice, since deprecated_siblings can
  //             never contain the target's own id, but reading it here is
  //             what forces Postgres to fully apply deprecated_siblings'
  //             write — removing the old sibling's live index entry —
  //             before this UPDATE attempts to insert its own)
  //           → audit INSERT (depends on target_version, so a lost race
  //             against either the queue CAS or the program-uniqueness
  //             index leaves no audit row).
  let result;
  try {
    result = await db.execute(sql`
      WITH claimed AS (
        UPDATE "pipeline_review_queue"
        SET "status" = 'approved', "reviewedAt" = ${now}, "reviewedBy" = ${userId}
        WHERE "id" = ${queueId}
          AND "status" = 'pending'
          AND "curriculumVersionId" = ${targetVersionId}
        RETURNING "curriculumVersionId"
      ),
      target_program AS (
        SELECT "id", "programId"
        FROM "pipeline_curriculum_version"
        WHERE "id" IN (SELECT "curriculumVersionId" FROM claimed)
      ),
      deprecated_siblings AS (
        -- Version lifecycle: only one version per program should be
        -- "approved" at a time (docs/factual-data-governance.md §5 — old
        -- versions move to deprecated, never deleted). Scoped strictly to
        -- the target version's own programId and excludes it by id. Must
        -- run — and fully commit its write — before target_version below,
        -- so the program-uniqueness index never sees two live 'approved'
        -- rows for the same programId at once.
        UPDATE "pipeline_curriculum_version"
        SET "status" = 'deprecated', "updatedAt" = ${now}
        WHERE "programId" IN (SELECT "programId" FROM target_program)
          AND "status" = 'approved'
          AND "id" NOT IN (SELECT "id" FROM target_program)
        RETURNING "id"
      ),
      target_version AS (
        UPDATE "pipeline_curriculum_version"
        SET "status" = 'approved', "updatedAt" = ${now}
        WHERE "id" IN (SELECT "id" FROM target_program)
          AND "id" NOT IN (SELECT "id" FROM deprecated_siblings)
        RETURNING "id", "programId"
      )
      INSERT INTO "audit_log" ("id", "userId", "action", "target", "meta")
      SELECT ${auditId}, ${userId}, 'pipeline.review.approve', ${queueId}, ${meta}
      FROM target_version
      RETURNING "id"
    `);
  } catch (e: unknown) {
    // The ONE expected concurrency conflict: two different queue items,
    // same program, both approved concurrently — the partial unique index
    // rejects the second writer. Map it to a clean domain error; every
    // other DB failure (including a same-code-but-different-cause 23505,
    // or anything unrelated) must propagate unchanged so it isn't silently
    // misclassified as "just a concurrency conflict".
    if (isUniqueViolation(e, ONE_APPROVED_PER_PROGRAM_INDEX)) {
      throw new Error("Another version of this program was approved concurrently.");
    }
    throw e;
  }

  if (result.rows.length === 0) {
    throw new Error("Review item is no longer pending");
  }

  revalidatePath(`/admin/pipeline/review`);
  revalidatePath(`/admin/pipeline/review/${queueId}`);
  return { success: true };
}

export async function rejectReview(queueId: string, versionId: string) {
  const { userId } = await assertReviewAccess();
  const db = requireDb();

  const [queueItem] = await db.select().from(pipelineReviewQueue).where(eq(pipelineReviewQueue.id, queueId));
  if (!queueItem) throw new Error("Review item not found");
  if (queueItem.status !== "pending") throw new Error("Review item is not pending");
  const targetVersionId = queueItem.curriculumVersionId;
  if (!targetVersionId || targetVersionId !== versionId) {
    throw new Error("Version mismatch");
  }

  const now = new Date();
  const meta = JSON.stringify({
    versionId: targetVersionId,
    previousStatus: "pending",
    newStatus: "rejected",
  });
  // See approveReview's comment on this exact same requirement.
  const auditId = crypto.randomUUID();

  // Same writable-CTE compare-and-set as approveReview (see its comment for
  // the full rationale): `claimed` only returns a row if this call actually
  // transitioned the queue from pending, and the version update + audit
  // insert both read from `claimed`, so a lost race naturally leaves every
  // dependent write affecting zero rows — no application-level branching.
  const result = await db.execute(sql`
    WITH claimed AS (
      UPDATE "pipeline_review_queue"
      SET "status" = 'rejected', "reviewedAt" = ${now}, "reviewedBy" = ${userId}
      WHERE "id" = ${queueId}
        AND "status" = 'pending'
        AND "curriculumVersionId" = ${targetVersionId}
      RETURNING "curriculumVersionId"
    ),
    target_version AS (
      UPDATE "pipeline_curriculum_version"
      SET "status" = 'deprecated', "updatedAt" = ${now}
      WHERE "id" IN (SELECT "curriculumVersionId" FROM claimed)
      RETURNING "id"
    )
    INSERT INTO "audit_log" ("id", "userId", "action", "target", "meta")
    SELECT ${auditId}, ${userId}, 'pipeline.review.reject', ${queueId}, ${meta}
    FROM claimed
    RETURNING "id"
  `);

  if (result.rows.length === 0) {
    throw new Error("Review item is no longer pending");
  }

  revalidatePath(`/admin/pipeline/review`);
  revalidatePath(`/admin/pipeline/review/${queueId}`);
  return { success: true };
}

export async function publishCurriculum(versionId: string) {
  const { userId } = await assertReviewAccess();
  const db = requireDb();
  try {
    // Read/validate/compile only — no write happens until the batch below.
    // Governance checks (approved status, evidence/confidence floor) live
    // inside prepareCurriculumPublish and throw before this point is ever
    // reached, so an invalid curriculum never gets this far.
    const prepared = await prepareCurriculumPublish(versionId);

    // Atomic: the academicStudyPlans write and its audit event must commit
    // together or not at all. Previously these were two sequential awaits —
    // a failed audit insert after a successful write left public data
    // changed with no record of it, and a retry would then read the
    // already-new value as "previous", permanently losing the true prior
    // state from the audit trail. db.batch() closes that window: `prepared
    // .overwrite` was captured from the true pre-write row before either
    // statement below ever runs.
    await db.batch([
      prepared.upsert,
      db.insert(auditLogs).values({
        userId,
        action: "pipeline.curriculum.publish",
        target: versionId,
        meta: JSON.stringify({
          country: prepared.country,
          university: prepared.university,
          specialization: prepared.specialization,
          overwrite: prepared.overwrite,
        }),
      }),
    ]);

    return { success: true };
  } catch (e: unknown) {
    console.error("Publish failed:", e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

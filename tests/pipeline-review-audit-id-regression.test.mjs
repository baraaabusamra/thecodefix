import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";
import {
  pipelineReviewQueue,
  pipelineCurriculumVersions,
} from "../src/db/schema.js";

// Regression suite for a real production bug found while implementing
// Phase 3.5B-4: approveReview's and rejectReview's writable-CTE audit_log
// INSERT (introduced in Phase 3.5B-3A, carried into 3.5B-3B) never
// supplied "id". audit_log.id has NO database-level default — every
// table's id in this schema is generated via Drizzle's $defaultFn(), which
// only runs inside the query builder (db.insert(table).values(...)) and
// never fires for a raw sql`...` INSERT. Verified directly against the
// real database (inside a transaction that was rolled back, no data
// committed): that INSERT shape throws `null value in column "id" ...
// violates not-null constraint`, meaning the entire single-statement CTE
// — including the queue-claim UPDATE and version-approval UPDATE — rolled
// back on every real invocation. The fix: generate the id explicitly in
// application code (crypto.randomUUID(), the same convention every table
// in src/db/schema.ts already uses for its own primary key) and include
// it in the raw SQL INSERT's column list.
//
// This suite proves, against a mock that faithfully models the real
// not-null constraint (unlike the other suites' mocks, which don't
// enforce column presence at all — that's exactly why this bug went
// undetected until a real-Postgres probe surfaced it):
// 1. the audit INSERT's id parameter is present, non-null, and UUID-shaped
// 2. two separate actions generate two DIFFERENT ids (not hardcoded/reused)
// 3. an INSERT missing "id" in its column list is correctly rejected by
//    the mock (proving the mock's constraint modeling is meaningful, not
//    a no-op)
// 4. failure atomicity is unaffected by this fix — a failure anywhere
//    still rolls back the whole statement, same as every other suite.

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let queueRow = null;
let versionsTable = [];
let auditRows = []; // [{ id, userId, action, target, meta }]
let shouldFail = false;

function resetState() {
  auditRows = [];
  shouldFail = false;
}

function fullText(sqlObj) {
  return sqlObj.queryChunks
    .filter((c) => c?.constructor?.name === "StringChunk")
    .map((c) => (Array.isArray(c.value) ? c.value.join("") : String(c.value)))
    .join("?");
}

function extractParams(sqlObj) {
  return sqlObj.queryChunks.filter((c) => c?.constructor?.name !== "StringChunk");
}

// Faithfully models the real not-null constraint on audit_log.id: this
// mock's INSERT handling only accepts a row if the statement's own column
// list explicitly names "id" — exactly the check real Postgres performs
// (implicitly, via NOT NULL) that the OTHER suites' mocks never modeled.
function auditInsertHasExplicitId(sqlObj) {
  return /INSERT INTO "audit_log" \("id", "userId"/.test(fullText(sqlObj));
}

function fakeDb() {
  return {
    select() {
      return {
        from(table) {
          return {
            where() {
              if (table === pipelineReviewQueue) return Promise.resolve(queueRow ? [queueRow] : []);
              if (table === pipelineCurriculumVersions) {
                const v = versionsTable.find((x) => x.id === queueRow?.curriculumVersionId);
                return Promise.resolve(v ? [v] : []);
              }
              return Promise.resolve([]);
            },
          };
        },
      };
    },
    async execute(sqlObj) {
      if (shouldFail) throw new Error("INJECTED_DB_FAILURE");

      const text = fullText(sqlObj);
      const isApprove = text.includes("pipeline.review.approve");
      const isReject = text.includes("pipeline.review.reject");
      if (!isApprove && !isReject) throw new Error("Unrecognized query shape in mock");

      // Faithful NOT NULL modeling: an audit_log INSERT without an
      // explicit "id" column throws, exactly like real Postgres.
      if (!auditInsertHasExplicitId(sqlObj)) {
        throw new Error(
          'null value in column "id" of relation "audit_log" violates not-null constraint'
        );
      }

      const params = extractParams(sqlObj);
      const won =
        queueRow &&
        queueRow.id === params[2] &&
        queueRow.status === "pending" &&
        queueRow.curriculumVersionId === params[3];
      if (!won) return { rows: [] };

      if (isApprove) {
        // now, userId, queueId, targetVersionId, now, now, auditId, userId, queueId, meta
        const [now, userId, , , , , auditId, , , meta] = params;
        queueRow.status = "approved";
        queueRow.reviewedAt = now;
        queueRow.reviewedBy = userId;
        const target = versionsTable.find((v) => v.id === queueRow.curriculumVersionId);
        target.status = "approved";
        auditRows.push({ id: auditId, userId, action: "pipeline.review.approve", target: queueRow.id, meta });
        return { rows: [{ id: auditId }] };
      }

      // now, userId, queueId, targetVersionId, now, auditId, userId, queueId, meta
      const [now, userId, , , , auditId, , , meta] = params;
      queueRow.status = "rejected";
      queueRow.reviewedAt = now;
      queueRow.reviewedBy = userId;
      const target = versionsTable.find((v) => v.id === queueRow.curriculumVersionId);
      target.status = "deprecated";
      auditRows.push({ id: auditId, userId, action: "pipeline.review.reject", target: queueRow.id, meta });
      return { rows: [{ id: auditId }] };
    },
  };
}

mock.module("@/db", { exports: { requireDb: () => fakeDb() } });
mock.module("@/lib/admin-access", { exports: { resolveAdmin: async () => ({ ok: true, mode: "rbac", role: "owner" }) } });
mock.module("@/auth", { exports: { auth: async () => ({ user: { id: "user-owner" } }) } });
mock.module("@/lib/curriculum/extraction/compiler", {
  exports: { prepareCurriculumPublish: async () => { throw new Error("not used in this suite"); } },
});
mock.module("next/cache", { exports: { revalidatePath: () => {} } });

const { approveReview, rejectReview } = await import(
  "../src/app/admin/pipeline/review/[id]/actions.js"
);

function setup(queueId, versionId) {
  queueRow = {
    id: queueId,
    curriculumVersionId: versionId,
    extractionRunId: "run-1",
    reason: "AI Extraction Ready for Review",
    status: "pending",
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: new Date(),
  };
  versionsTable.push({ id: versionId, programId: `program-${versionId}`, status: "draft", updatedAt: new Date() });
}

test("approveReview: audit insert succeeds with a non-null, UUID-shaped id (real not-null constraint modeled)", async () => {
  resetState();
  versionsTable = [];
  setup("queue-1", "version-1");

  const result = await approveReview("queue-1", "version-1");

  assert.deepStrictEqual(result, { success: true });
  assert.strictEqual(auditRows.length, 1);
  assert.ok(auditRows[0].id, "audit id must be present (non-null)");
  assert.match(auditRows[0].id, UUID_RE, "audit id must be a well-formed UUID");
});

test("rejectReview: audit insert succeeds with a non-null, UUID-shaped id (real not-null constraint modeled)", async () => {
  resetState();
  versionsTable = [];
  setup("queue-2", "version-2");

  const result = await rejectReview("queue-2", "version-2");

  assert.deepStrictEqual(result, { success: true });
  assert.strictEqual(auditRows.length, 1);
  assert.ok(auditRows[0].id, "audit id must be present (non-null)");
  assert.match(auditRows[0].id, UUID_RE, "audit id must be a well-formed UUID");
});

test("audit id is freshly generated per call, not hardcoded or reused across actions", async () => {
  resetState();
  versionsTable = [];
  setup("queue-3", "version-3");
  await approveReview("queue-3", "version-3");
  const firstId = auditRows[0].id;

  setup("queue-4", "version-4");
  await rejectReview("queue-4", "version-4");
  const secondId = auditRows[1].id;

  assert.notStrictEqual(firstId, secondId, "each call must generate its own distinct id");
  assert.match(firstId, UUID_RE);
  assert.match(secondId, UUID_RE);
});

test("mock's not-null modeling is meaningful: an audit insert missing the id column is rejected (proves this suite would have caught the real bug)", async () => {
  resetState();
  versionsTable = [];
  setup("queue-5", "version-5");

  // Directly exercise the mock's constraint check the way the OLD
  // (buggy) actions.ts code would have, bypassing the real implementation
  // to prove the mock's modeling is real, not a tautology.
  const db = fakeDb();
  const { sql } = await import("drizzle-orm");
  const oldShapeStatement = sql`
    WITH claimed AS (SELECT 1 AS x)
    INSERT INTO "audit_log" ("userId", "action", "target", "meta")
    SELECT 'user-owner', 'pipeline.review.approve', 'queue-5', '{}'
    FROM claimed
    RETURNING "id"
  `;
  await assert.rejects(db.execute(oldShapeStatement), /violates not-null constraint/);
});

test("failure atomicity unaffected by the id fix: injected failure rolls back the whole statement, zero audit rows", async () => {
  resetState();
  versionsTable = [];
  setup("queue-6", "version-6");
  shouldFail = true;

  await assert.rejects(approveReview("queue-6", "version-6"));

  assert.strictEqual(queueRow.status, "pending");
  assert.strictEqual(versionsTable.find((v) => v.id === "version-6").status, "draft");
  assert.strictEqual(auditRows.length, 0);
});

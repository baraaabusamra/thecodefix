import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";
import { NeonDbError } from "@neondatabase/serverless";

// Phase 3.5B-3B fix (P1-D2): pipelineCurriculumVersions now has a partial
// unique index — "pipeline_curriculum_version_one_approved_per_program"
// (src/db/schema.ts) — enforcing at most one status='approved' row per
// programId at the DB level. approveReview's CTE was reordered (claimed →
// target_program → deprecated_siblings → target_version → audit, each
// step depending on the previous one's RETURNING output) so that any
// pre-existing approved sibling is deprecated inside the SAME statement
// before the target is written to 'approved' — otherwise the index would
// reject even a normal, non-concurrent replacement. See the Phase 3.5B-3B
// audit for the full Postgres-semantics reasoning.
//
// HONESTY NOTE (same caveat as tests/pipeline-review-concurrency.test.mjs):
// this suite cannot execute real Postgres, so it cannot itself verify the
// CTE's SQL validity or Postgres's actual snapshot-vs-live-index-check
// behavior — that rests on Postgres's own documented guarantees, reasoned
// through in the audit, not on anything empirically provable here. What
// this suite DOES prove: (1) the application's error classification
// correctly distinguishes the expected unique-violation conflict (by
// .code AND .constraint, using the REAL NeonDbError class — not a
// hand-rolled shape) from every other DB failure, and (2) given a modeled
// "two concurrent statements, one already committed" outcome, the losing
// call's state is left completely untouched (no queue transition, no
// version mutation, no audit row) while the winner's effects are fully
// and correctly applied — the same rollback guarantee already proven for
// the same-queue race in Phase 3.5B-3A, now exercised across two
// different queue items competing for the same program.
//
// The mock models the one Postgres behavior this fix actually depends on:
// deprecated_siblings' decision is fixed against a snapshot taken when
// the statement STARTS (mirroring "all CTEs in one WITH share one MVCC
// snapshot"), while target_version's write is checked against the LIVE
// state at the moment it would commit (mirroring how a unique index must
// always enforce against reality, not a stale snapshot) — that gap is
// exactly what produces a genuine unique_violation under concurrency.

let queueTable = []; // [{ id, status, curriculumVersionId, reviewedBy, reviewedAt }]
let versionsTable = []; // [{ id, programId, status, updatedAt }]
let auditRows = []; // [{ userId, action, target, meta }]
let shouldFail = false; // generic non-Postgres DB failure
let injectedError = null; // { code, constraint } — force a specific NeonDbError shape

let gatesEnabled = false;
let gateQueue = []; // [{ resolve, sqlObj }]

let authQueue = null;
let fixedAuthUserId = "user-owner";

function resetState() {
  queueTable = [];
  versionsTable = [];
  auditRows = [];
  shouldFail = false;
  injectedError = null;
  gatesEnabled = false;
  gateQueue = [];
  authQueue = null;
  fixedAuthUserId = "user-owner";
}

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
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

// eq(column, value) conditions carry the bound value as a "Param" chunk
// (verified directly against the installed drizzle-orm — distinct from
// the plain-primitive shape a raw sql`...${x}...` template produces).
function idFromCondition(condition) {
  const paramChunk = condition.queryChunks.find((c) => c?.constructor?.name === "Param");
  return paramChunk?.value;
}

const { pipelineReviewQueue, pipelineCurriculumVersions } = await import("../src/db/schema.js");

function fakeDb() {
  return {
    select() {
      return {
        from(table) {
          return {
            where(condition) {
              const id = idFromCondition(condition);
              if (table === pipelineReviewQueue) {
                const row = queueTable.find((q) => q.id === id);
                return Promise.resolve(row ? [row] : []);
              }
              if (table === pipelineCurriculumVersions) {
                const row = versionsTable.find((v) => v.id === id);
                return Promise.resolve(row ? [row] : []);
              }
              return Promise.resolve([]);
            },
          };
        },
      };
    },
    async execute(sqlObj) {
      const text = fullText(sqlObj);
      const params = extractParams(sqlObj);
      const isApprove = text.includes("pipeline.review.approve");
      const isReject = text.includes("pipeline.review.reject");

      // Snapshot decision taken at STATEMENT START, before any gating
      // delay — mirrors "every CTE in one WITH shares one MVCC snapshot".
      let queueRow = null;
      let targetRow = null;
      let programId = null;
      let wouldClaim = false;
      let siblingIdsToDeprecateAtStart = [];

      if (isApprove || isReject) {
        const [, , queueId, targetVersionId] = params;
        queueRow = queueTable.find((q) => q.id === queueId);
        targetRow = versionsTable.find((v) => v.id === targetVersionId);
        wouldClaim = !!(
          queueRow &&
          queueRow.status === "pending" &&
          queueRow.curriculumVersionId === targetVersionId
        );
        if (isApprove && wouldClaim && targetRow) {
          programId = targetRow.programId;
          siblingIdsToDeprecateAtStart = versionsTable
            .filter((v) => v.programId === programId && v.status === "approved" && v.id !== targetRow.id)
            .map((v) => v.id);
        }
      }

      if (gatesEnabled) {
        await new Promise((resolve) => gateQueue.push({ resolve, sqlObj }));
      }
      if (shouldFail) {
        throw new Error("INJECTED_DB_FAILURE");
      }
      if (injectedError) {
        const err = new NeonDbError("simulated Postgres failure");
        err.code = injectedError.code;
        err.constraint = injectedError.constraint;
        throw err;
      }

      if (isApprove) {
        if (!wouldClaim) return { rows: [] };
        const [now, userId, queueId, , , , , , meta] = params;

        // target_version's write: checked against the CURRENT live state,
        // not the start-of-statement snapshot — a sibling that became
        // 'approved' by a DIFFERENT statement AFTER this one started (and
        // therefore isn't in siblingIdsToDeprecateAtStart) still collides
        // here, exactly like a real partial unique index at write time.
        const stillConflicting = versionsTable.some(
          (v) =>
            v.programId === programId &&
            v.status === "approved" &&
            v.id !== targetRow.id &&
            !siblingIdsToDeprecateAtStart.includes(v.id)
        );
        if (stillConflicting) {
          const err = new NeonDbError(
            'duplicate key value violates unique constraint "pipeline_curriculum_version_one_approved_per_program"'
          );
          err.code = "23505";
          err.constraint = "pipeline_curriculum_version_one_approved_per_program";
          throw err;
        }

        queueRow.status = "approved";
        queueRow.reviewedAt = now;
        queueRow.reviewedBy = userId;
        for (const id of siblingIdsToDeprecateAtStart) {
          const v = versionsTable.find((x) => x.id === id);
          v.status = "deprecated";
          v.updatedAt = now;
        }
        targetRow.status = "approved";
        targetRow.updatedAt = now;

        auditRows.push({ userId, action: "pipeline.review.approve", target: queueId, meta });
        return { rows: [{ id: `audit-${auditRows.length}` }] };
      }

      if (isReject) {
        if (!wouldClaim) return { rows: [] };
        const [now, userId, queueId, , , , , meta] = params;
        queueRow.status = "rejected";
        queueRow.reviewedAt = now;
        queueRow.reviewedBy = userId;
        targetRow.status = "deprecated";
        targetRow.updatedAt = now;
        auditRows.push({ userId, action: "pipeline.review.reject", target: queueId, meta });
        return { rows: [{ id: `audit-${auditRows.length}` }] };
      }

      throw new Error("Unrecognized query shape in mock");
    },
  };
}

let resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });

mock.module("@/db", { exports: { requireDb: () => fakeDb() } });
mock.module("@/lib/admin-access", { exports: { resolveAdmin: (...a) => resolveAdminMock(...a) } });
mock.module("@/auth", {
  exports: {
    auth: async () => {
      const id = authQueue && authQueue.length ? authQueue.shift() : fixedAuthUserId;
      return { user: { id } };
    },
  },
});
mock.module("@/lib/curriculum/extraction/compiler", {
  exports: { prepareCurriculumPublish: async () => { throw new Error("not used in this suite"); } },
});
mock.module("next/cache", { exports: { revalidatePath: () => {} } });

const { approveReview, rejectReview } = await import(
  "../src/app/admin/pipeline/review/[id]/actions.js"
);

function addQueueItem(id, curriculumVersionId, status = "pending") {
  queueTable.push({
    id,
    curriculumVersionId,
    extractionRunId: "run-1",
    reason: "AI Extraction Ready for Review",
    status,
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: new Date(),
  });
}

function addVersion(id, programId, status) {
  versionsTable.push({ id, programId, status, updatedAt: new Date() });
}

async function startConcurrentPair(fnA, userA, argsA, fnB, userB, argsB) {
  gatesEnabled = true;
  authQueue = [userA, userB];
  const pA = fnA(...argsA);
  const pB = fnB(...argsB);
  await flush();
  assert.strictEqual(gateQueue.length, 2, "both concurrent calls must reach the gated statement before either commits");
  return { pA, pB };
}

function releaseGateAt(index) {
  const entry = gateQueue.splice(index, 1)[0];
  if (!entry) throw new Error(`No gated call at index ${index}`);
  entry.resolve();
}

// ── A: sequential replacement ─────────────────────────────────────────────

test("A. sequential replacement: V1 approved, V2 draft -> approve V2 -> V1 deprecated, V2 approved, one audit record", async () => {
  resetState();
  addVersion("V1", "program-P", "approved");
  addVersion("V2", "program-P", "draft");
  addQueueItem("Q2", "V2", "pending");

  const result = await approveReview("Q2", "V2");

  assert.deepStrictEqual(result, { success: true });
  assert.strictEqual(versionsTable.find((v) => v.id === "V1").status, "deprecated");
  assert.strictEqual(versionsTable.find((v) => v.id === "V2").status, "approved");
  assert.strictEqual(queueTable.find((q) => q.id === "Q2").status, "approved");
  assert.strictEqual(auditRows.length, 1);
  assert.strictEqual(auditRows[0].action, "pipeline.review.approve");
});

// ── B: different programs ──────────────────────────────────────────────────

test("B. different programs: approving P2/V2 does not affect P1/V1", async () => {
  resetState();
  addVersion("V1", "program-P1", "approved");
  addVersion("V2", "program-P2", "draft");
  addQueueItem("Q2", "V2", "pending");

  const result = await approveReview("Q2", "V2");

  assert.deepStrictEqual(result, { success: true });
  assert.strictEqual(versionsTable.find((v) => v.id === "V1").status, "approved", "different program's version must remain untouched");
  assert.strictEqual(versionsTable.find((v) => v.id === "V2").status, "approved");
});

// ── C: core D2 concurrency ─────────────────────────────────────────────────

test("C. concurrent different versions, same program: exactly one approved version, loser fully rolled back", async () => {
  resetState();
  addVersion("V1", "program-P", "draft");
  addVersion("V2", "program-P", "draft");
  addQueueItem("Q1", "V1", "pending");
  addQueueItem("Q2", "V2", "pending");

  const { pA, pB } = await startConcurrentPair(
    approveReview, "user-A", ["Q1", "V1"],
    approveReview, "user-B", ["Q2", "V2"]
  );
  releaseGateAt(0); // whichever reached the gate first commits first
  releaseGateAt(0); // the remaining one now sees the live conflict

  const [resA, resB] = await Promise.allSettled([pA, pB]);
  const outcomes = [resA, resB];
  const fulfilled = outcomes.filter((r) => r.status === "fulfilled");
  const failed = outcomes.filter((r) => r.status === "rejected");
  assert.strictEqual(fulfilled.length, 1, "exactly one approval must succeed");
  assert.strictEqual(failed.length, 1, "exactly one approval must fail");
  assert.match(failed[0].reason.message, /Another version of this program was approved concurrently\./);

  const approvedVersions = versionsTable.filter((v) => v.programId === "program-P" && v.status === "approved");
  assert.strictEqual(approvedVersions.length, 1, "exactly one approved version for program-P");
  assert.strictEqual(auditRows.length, 1, "only the winner produced an audit row");

  const winnerIsV1 = approvedVersions[0].id === "V1";
  const winnerQueueId = winnerIsV1 ? "Q1" : "Q2";
  const loserQueueId = winnerIsV1 ? "Q2" : "Q1";
  const loserVersionId = winnerIsV1 ? "V2" : "V1";

  assert.strictEqual(queueTable.find((q) => q.id === winnerQueueId).status, "approved");
  assert.strictEqual(queueTable.find((q) => q.id === loserQueueId).status, "pending", "loser's queue claim must roll back");
  assert.strictEqual(versionsTable.find((v) => v.id === loserVersionId).status, "draft", "loser's target must remain draft");
});

// ── D: clean unique-conflict error ─────────────────────────────────────────

test("D. unique violation with the correct constraint name produces the clean domain error", async () => {
  resetState();
  addVersion("V1", "program-P", "draft");
  addQueueItem("Q1", "V1", "pending");
  injectedError = { code: "23505", constraint: "pipeline_curriculum_version_one_approved_per_program" };

  await assert.rejects(
    approveReview("Q1", "V1"),
    (err) => {
      assert.strictEqual(err.message, "Another version of this program was approved concurrently.");
      return true;
    }
  );
});

// ── E: wrong unique constraint ─────────────────────────────────────────────

test("E. 23505 with a DIFFERENT constraint propagates the original error unchanged", async () => {
  resetState();
  addVersion("V1", "program-P", "draft");
  addQueueItem("Q1", "V1", "pending");
  injectedError = { code: "23505", constraint: "some_other_unrelated_constraint" };

  await assert.rejects(
    approveReview("Q1", "V1"),
    (err) => {
      assert.notStrictEqual(err.message, "Another version of this program was approved concurrently.");
      assert.strictEqual(err.code, "23505");
      assert.strictEqual(err.constraint, "some_other_unrelated_constraint");
      return true;
    }
  );
});

// ── F: non-23505 DB failure ────────────────────────────────────────────────

test("F. a non-23505 DB failure propagates the original error unchanged", async () => {
  resetState();
  addVersion("V1", "program-P", "draft");
  addQueueItem("Q1", "V1", "pending");
  injectedError = { code: "40001", constraint: undefined }; // e.g. serialization_failure

  await assert.rejects(
    approveReview("Q1", "V1"),
    (err) => {
      assert.notStrictEqual(err.message, "Another version of this program was approved concurrently.");
      assert.strictEqual(err.code, "40001");
      return true;
    }
  );
});

// ── G: raw DB error not leaked ─────────────────────────────────────────────

test("G. the clean domain error never contains raw constraint/DB identifiers", async () => {
  resetState();
  addVersion("V1", "program-P", "draft");
  addQueueItem("Q1", "V1", "pending");
  injectedError = { code: "23505", constraint: "pipeline_curriculum_version_one_approved_per_program" };

  await assert.rejects(approveReview("Q1", "V1"), (err) => {
    assert.ok(!err.message.includes("pipeline_curriculum_version_one_approved_per_program"));
    assert.ok(!err.message.includes("23505"));
    assert.ok(!err.message.toLowerCase().includes("constraint"));
    return true;
  });
});

// ── H: deprecated/draft siblings coexist ───────────────────────────────────

test("H. deprecated and draft siblings in the same program are left alone", async () => {
  resetState();
  addVersion("V0", "program-P", "deprecated");
  addVersion("V3", "program-P", "draft");
  addVersion("V2", "program-P", "draft");
  addQueueItem("Q2", "V2", "pending");

  await approveReview("Q2", "V2");

  assert.strictEqual(versionsTable.find((v) => v.id === "V0").status, "deprecated");
  assert.strictEqual(versionsTable.find((v) => v.id === "V3").status, "draft");
  assert.strictEqual(versionsTable.find((v) => v.id === "V2").status, "approved");
});

// ── I: rejectReview unaffected ─────────────────────────────────────────────

test("I. rejectReview is entirely unaffected by the program-uniqueness index", async () => {
  resetState();
  addVersion("V1", "program-P", "approved");
  addVersion("V2", "program-P", "draft");
  addQueueItem("Q2", "V2", "pending");

  const result = await rejectReview("Q2", "V2");

  assert.deepStrictEqual(result, { success: true });
  assert.strictEqual(versionsTable.find((v) => v.id === "V2").status, "deprecated");
  assert.strictEqual(versionsTable.find((v) => v.id === "V1").status, "approved", "unrelated approved sibling untouched by reject");
});

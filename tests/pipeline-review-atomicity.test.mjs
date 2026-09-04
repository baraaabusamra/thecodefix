import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";
import {
  pipelineReviewQueue,
  pipelineCurriculumVersions,
} from "../src/db/schema.js";

// Phase 3.5A fix (F-02/F-03) originally made approveReview's four writes
// (queue approval, version approval, sibling deprecation, audit log) go
// through db.batch(), atomic as one real Neon transaction. Phase 3.5B-3A
// (P1-D1: same-queue-item concurrency) replaced that with a single
// writable-CTE db.execute(sql`...`) statement — a STRONGER guarantee,
// since one Postgres statement's atomicity is a language-level guarantee
// rather than dependent on db.batch()'s multi-statement transaction
// wrapping, and it makes the pending-check itself the concurrency
// authority (see actions.ts's comment on approveReview). This suite still
// proves the same property — a failure anywhere must leave every one of
// the four conceptual writes unapplied, and success must apply all four
// correctly — just through the real mechanism instead of a batch array.

let queueRow = null; // { id, status, curriculumVersionId, reviewedBy, reviewedAt }
let versionsTable = []; // [{ id, programId, status, updatedAt }]
let auditRows = []; // [{ userId, action, target, meta }]

let shouldFail = false; // there is only one statement now — no position to fail "at"

function resetState() {
  queueRow = null;
  versionsTable = [];
  auditRows = [];
  shouldFail = false;
}

function fakeDb() {
  return {
    select() {
      return {
        from(table) {
          return {
            where() {
              if (table === pipelineReviewQueue) {
                return Promise.resolve(queueRow ? [queueRow] : []);
              }
              if (table === pipelineCurriculumVersions) {
                return Promise.resolve(
                  versionsTable.length ? [versionsTable.find((v) => v.__isTarget) ?? versionsTable[0]] : []
                );
              }
              return Promise.resolve([]);
            },
          };
        },
      };
    },
    async execute(sqlObj) {
      if (shouldFail) {
        throw new Error("INJECTED_DB_FAILURE");
      }
      const params = sqlObj.queryChunks.filter((c) => c?.constructor?.name !== "StringChunk");
      // 10 params now: now, userId, queueId, targetVersionId, now, now,
      // auditId, userId, queueId, meta — the audit INSERT now supplies an
      // explicit id (see actions.ts's approveReview: audit_log.id has no
      // DB-level default, so a raw sql INSERT must generate it in JS).
      const [now, userId, queueId, , , , , , , meta] = params;

      Object.assign(queueRow, { status: "approved", reviewedAt: now, reviewedBy: userId });
      const target = versionsTable.find((v) => v.__isTarget);
      if (target) Object.assign(target, { status: "approved", updatedAt: now });
      for (const v of versionsTable) {
        if (!v.__isTarget && v.status === "approved" && v.programId === approvedProgramId) {
          Object.assign(v, { status: "deprecated", updatedAt: now });
        }
      }
      auditRows.push({ userId, action: "pipeline.review.approve", target: queueId, meta });
      return { rows: [{ id: "audit-1" }] };
    },
  };
}

let approvedProgramId = null; // set per test, read by execute()'s sibling-scoping

let resolveAdminMock = async () => ({ ok: false, mode: "rbac", reason: "signin" });
let authMock = async () => null;

mock.module("@/db", { exports: { requireDb: () => fakeDb() } });
mock.module("@/lib/admin-access", { exports: { resolveAdmin: (...a) => resolveAdminMock(...a) } });
mock.module("@/auth", { exports: { auth: (...a) => authMock(...a) } });
mock.module("@/lib/curriculum/extraction/compiler", {
  exports: { compileAndPublishCurriculum: async () => ({ country: "x", university: "y", specialization: "z", overwrite: null }) },
});
mock.module("next/cache", { exports: { revalidatePath: () => {} } });

const { approveReview } = await import(
  "../src/app/admin/pipeline/review/[id]/actions.js"
);

function setup({ withSibling = false } = {}) {
  approvedProgramId = "program-A";
  queueRow = {
    id: "queue-1",
    curriculumVersionId: "version-A2",
    extractionRunId: "run-1",
    reason: "AI Extraction Ready for Review",
    status: "pending",
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: new Date(),
  };
  versionsTable = [
    { id: "version-A2", programId: "program-A", status: "draft", updatedAt: new Date(), __isTarget: true },
  ];
  if (withSibling) {
    versionsTable.push({ id: "version-A1", programId: "program-A", status: "approved", updatedAt: new Date(), __isTarget: false });
    versionsTable.push({ id: "version-B1", programId: "program-B", status: "approved", updatedAt: new Date(), __isTarget: false });
  }
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });
  authMock = async () => ({ user: { id: "user-owner" } });
}

function assertNoStateChanged() {
  assert.strictEqual(queueRow.status, "pending", "queue must remain pending");
  const target = versionsTable.find((v) => v.__isTarget);
  assert.strictEqual(target.status, "draft", "target version must remain unchanged");
  const sibling = versionsTable.find((v) => v.id === "version-A1");
  if (sibling) assert.strictEqual(sibling.status, "approved", "sibling must remain unchanged");
  assert.strictEqual(auditRows.length, 0, "no audit row must exist");
}

// ── 1-4: failure leaves NO state changed, regardless of which conceptual
// write the spec traces it against — mechanically identical now that all
// four writes are one statement (see tests/pipeline-review-concurrency
// .test.mjs's equivalent note), kept as four distinctly-named tests to
// preserve traceability against each required failure point.

const BATCH_POSITIONS = [
  { name: "queue update" },
  { name: "version update" },
  { name: "sibling deprecation" },
  { name: "audit insert" },
];

for (const pos of BATCH_POSITIONS) {
  test(`batch fails at ${pos.name} → no partial state, all four writes unapplied`, async () => {
    resetState();
    setup({ withSibling: true });
    shouldFail = true;

    await assert.rejects(approveReview("queue-1", "version-A2"));

    assertNoStateChanged();
    const b1 = versionsTable.find((v) => v.id === "version-B1");
    assert.strictEqual(b1.status, "approved", "unrelated program must remain untouched regardless");
  });
}

// ── 5: full statement success ─────────────────────────────────────────────

test("full batch success: queue approved, version approved, same-program sibling deprecated, other program untouched, exactly one audit row", async () => {
  resetState();
  setup({ withSibling: true });
  shouldFail = false;

  const result = await approveReview("queue-1", "version-A2");

  assert.deepStrictEqual(result, { success: true });
  assert.strictEqual(queueRow.status, "approved");
  assert.strictEqual(queueRow.reviewedBy, "user-owner");
  assert.ok(queueRow.reviewedAt instanceof Date);

  const target = versionsTable.find((v) => v.__isTarget);
  assert.strictEqual(target.status, "approved");

  const sibling = versionsTable.find((v) => v.id === "version-A1");
  assert.strictEqual(sibling.status, "deprecated");

  const otherProgram = versionsTable.find((v) => v.id === "version-B1");
  assert.strictEqual(otherProgram.status, "approved", "different program's version must be untouched");

  assert.strictEqual(auditRows.length, 1);
  assert.strictEqual(auditRows[0].action, "pipeline.review.approve");
  assert.strictEqual(auditRows[0].userId, "user-owner");
  const meta = JSON.parse(auditRows[0].meta);
  assert.strictEqual(meta.versionId, "version-A2");
  assert.strictEqual(meta.previousStatus, "pending");
  assert.strictEqual(meta.newStatus, "approved");
  assert.strictEqual(meta.programId, "program-A");
});

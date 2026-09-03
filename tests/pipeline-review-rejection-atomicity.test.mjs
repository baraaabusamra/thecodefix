import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";
import {
  pipelineReviewQueue,
  pipelineCurriculumVersions,
} from "../src/db/schema.js";

// Phase 3.5B-1 fix (P1-C) originally made rejectReview's three writes
// (queue rejection, version deprecation, audit log) go through db.batch(),
// the same proven Neon HTTP transaction primitive Phase 3.5A used for
// approveReview. Phase 3.5B-3A (P1-D1: same-queue-item concurrency)
// replaced that with a single writable-CTE db.execute(sql`...`) statement —
// a STRONGER guarantee, since one Postgres statement's atomicity is a
// language-level guarantee rather than dependent on db.batch()'s
// multi-statement transaction wrapping, and it makes the pending-check
// itself the concurrency authority (see actions.ts's comment on
// approveReview, which rejectReview mirrors). This suite still proves the
// same property — a failure anywhere must leave every one of the three
// conceptual writes unapplied, and success must apply all three correctly
// — just through the real mechanism instead of a batch array.

let queueRow = null; // { id, status, curriculumVersionId, reviewedBy, reviewedAt }
let versionRow = null; // { id, status, updatedAt }
let auditRows = []; // [{ userId, action, target, meta }]

let shouldFail = false; // there is only one statement now — no position to fail "at"

function resetState() {
  queueRow = null;
  versionRow = null;
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
                return Promise.resolve(versionRow ? [versionRow] : []);
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
      // 9 params now: now, userId, queueId, targetVersionId, now, auditId,
      // userId, queueId, meta — the audit INSERT now supplies an explicit
      // id (see actions.ts's rejectReview: audit_log.id has no DB-level
      // default, so a raw sql INSERT must generate it in JS).
      const [now, userId, queueId, , , , , , meta] = params;

      Object.assign(queueRow, { status: "rejected", reviewedAt: now, reviewedBy: userId });
      Object.assign(versionRow, { status: "deprecated", updatedAt: now });
      auditRows.push({ userId, action: "pipeline.review.reject", target: queueId, meta });
      return { rows: [{ id: "audit-1" }] };
    },
  };
}

let resolveAdminMock = async () => ({ ok: false, mode: "rbac", reason: "signin" });
let authMock = async () => null;

mock.module("@/db", { exports: { requireDb: () => fakeDb() } });
mock.module("@/lib/admin-access", { exports: { resolveAdmin: (...a) => resolveAdminMock(...a) } });
mock.module("@/auth", { exports: { auth: (...a) => authMock(...a) } });
mock.module("@/lib/curriculum/extraction/compiler", {
  exports: { compileAndPublishCurriculum: async () => ({ country: "x", university: "y", specialization: "z", overwrite: null }) },
});
mock.module("next/cache", { exports: { revalidatePath: () => {} } });

const { rejectReview } = await import(
  "../src/app/admin/pipeline/review/[id]/actions.js"
);

function setup() {
  queueRow = {
    id: "queue-1",
    curriculumVersionId: "version-1",
    extractionRunId: "run-1",
    reason: "AI Extraction Ready for Review",
    status: "pending",
    reviewedBy: null,
    reviewedAt: null,
    reviewNotes: null,
    createdAt: new Date(),
  };
  versionRow = { id: "version-1", programId: "program-A", status: "draft", updatedAt: new Date() };
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });
  authMock = async () => ({ user: { id: "user-owner" } });
}

function assertNoStateChanged() {
  assert.strictEqual(queueRow.status, "pending", "queue must remain pending");
  assert.strictEqual(versionRow.status, "draft", "version must remain unchanged");
  assert.strictEqual(auditRows.length, 0, "no audit row must exist");
}

async function assertForbidden(call) {
  await assert.rejects(call, /Forbidden/);
}

// ── 1-3: failure leaves NO state changed, regardless of which conceptual
// write the spec traces it against — mechanically identical now that all
// three writes are one statement, kept as three distinctly-named tests to
// preserve traceability against each required failure point.

const BATCH_POSITIONS = [
  { name: "queue update" },
  { name: "version update" },
  { name: "audit insert" },
];

for (const pos of BATCH_POSITIONS) {
  test(`batch fails at ${pos.name} → no partial state, all three writes unapplied`, async () => {
    resetState();
    setup();
    shouldFail = true;

    await assert.rejects(rejectReview("queue-1", "version-1"));

    assertNoStateChanged();
  });
}

// ── 4: full statement success ─────────────────────────────────────────────

test("full batch success: queue rejected, version deprecated, exactly one audit row", async () => {
  resetState();
  setup();
  shouldFail = false;

  const result = await rejectReview("queue-1", "version-1");

  assert.deepStrictEqual(result, { success: true });
  assert.strictEqual(queueRow.status, "rejected");
  assert.strictEqual(versionRow.status, "deprecated");
  assert.strictEqual(auditRows.length, 1);
  assert.strictEqual(auditRows[0].action, "pipeline.review.reject");
  assert.strictEqual(auditRows[0].target, "queue-1");
  const meta = JSON.parse(auditRows[0].meta);
  assert.strictEqual(meta.versionId, "version-1");
  assert.strictEqual(meta.previousStatus, "pending");
  assert.strictEqual(meta.newStatus, "rejected");
});

// ── 5: reviewedBy correct for a real authenticated user ───────────────────

test("reviewedBy is set from the authenticated session's real user id", async () => {
  resetState();
  setup();
  authMock = async () => ({ user: { id: "real-user-id-42" } });

  await rejectReview("queue-1", "version-1");

  assert.strictEqual(queueRow.reviewedBy, "real-user-id-42");
  assert.ok(queueRow.reviewedAt instanceof Date);
});

// ── 6: ADMIN_TOKEN fallback — reviewedBy/audit userId are null ───────────

test("ADMIN_TOKEN fallback (no session) → reviewedBy and audit userId are null", async () => {
  resetState();
  setup();
  resolveAdminMock = async () => ({ ok: true, mode: "token", role: "owner" });
  authMock = async () => null; // no session in token fallback mode

  await rejectReview("queue-1", "version-1");

  assert.strictEqual(queueRow.reviewedBy, null);
  assert.strictEqual(auditRows[0].userId, null);
});

// ── 7 & 8: unauthorized / wrong role → zero DB writes ─────────────────────

test("unauthenticated caller: Forbidden, zero DB writes", async () => {
  resetState();
  setup();
  resolveAdminMock = async () => ({ ok: false, mode: "rbac", reason: "signin" });

  await assertForbidden(rejectReview("queue-1", "version-1"));

  assertNoStateChanged();
});

test("wrong role (lacks content:edit): Forbidden, zero DB writes", async () => {
  resetState();
  setup();
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "operations" });

  await assertForbidden(rejectReview("queue-1", "version-1"));

  assertNoStateChanged();
});

// ── 9: queue/version mismatch (IDOR) → zero mutations ─────────────────────

test("supplied versionId does not match the queue item's curriculumVersionId → zero mutations", async () => {
  resetState();
  setup();

  await assert.rejects(rejectReview("queue-1", "version-ATTACKER"), /Version mismatch/);

  assertNoStateChanged();
});

// ── 10: queue already approved/rejected → zero mutations ─────────────────

for (const priorStatus of ["approved", "rejected"]) {
  test(`queue item already ${priorStatus}: rejects, zero mutations`, async () => {
    resetState();
    setup();
    queueRow.status = priorStatus;

    await assert.rejects(rejectReview("queue-1", "version-1"), /not pending/);

    assert.strictEqual(queueRow.status, priorStatus, "queue status must not change further");
    assert.strictEqual(versionRow.status, "draft");
    assert.strictEqual(auditRows.length, 0);
  });
}

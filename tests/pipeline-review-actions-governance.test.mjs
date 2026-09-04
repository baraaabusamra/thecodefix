import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";
import {
  pipelineReviewQueue,
  pipelineCurriculumVersions,
  auditLogs,
} from "../src/db/schema.js";

// Phase 3 additions to src/app/admin/pipeline/review/[id]/actions.ts:
// audit logging (approve/reject/publish) and sibling-version deprecation on
// approve. To prove deprecation is correctly SCOPED (same program only,
// never the version being approved) — not just that an UPDATE call
// happened — this suite uses the real, unmocked drizzle-orm eq/and/ne and
// walks the resulting SQL fragment's queryChunks to recover the actual
// column/operator/value comparisons, then evaluates those against an
// in-memory pipelineCurriculumVersions table. This avoids mocking
// drizzle-orm itself (which conflicts with importing the real
// src/db/schema in the same file) while still testing the code's real
// query-building logic, not a hand-rolled reimplementation of it.

function extractComparisons(sql, out = []) {
  if (!sql || !sql.queryChunks) return out;
  let pendingColumn = null;
  let pendingOp = null;
  for (const chunk of sql.queryChunks) {
    if (!chunk) continue;
    if (chunk.table && chunk.name) {
      pendingColumn = chunk.name;
    } else if (chunk.constructor?.name === "StringChunk") {
      const text = Array.isArray(chunk.value) ? chunk.value.join("") : String(chunk.value);
      if (text.includes("<>")) pendingOp = "<>";
      else if (text.includes("=")) pendingOp = "=";
    } else if (chunk.constructor?.name === "Param") {
      if (pendingColumn) {
        out.push({ column: pendingColumn, op: pendingOp, value: chunk.value });
        pendingColumn = null;
        pendingOp = null;
      }
    } else if (chunk.queryChunks) {
      extractComparisons(chunk, out);
    }
  }
  return out;
}

function matches(row, condition) {
  const comparisons = extractComparisons(condition);
  assert.ok(comparisons.length > 0, "expected at least one comparison in the WHERE condition");
  return comparisons.every(({ column, op, value }) =>
    op === "<>" ? row[column] !== value : row[column] === value
  );
}

let queueItemFixture = null;
let versionsTable = []; // in-memory pipelineCurriculumVersions rows

const updateCalls = []; // { table, values, matchedIds }
const insertCalls = []; // { table, values }
const revalidatePathCalls = [];

function resetState() {
  queueItemFixture = null;
  versionsTable = [];
  updateCalls.length = 0;
  insertCalls.length = 0;
  revalidatePathCalls.length = 0;
}

function fakeDb() {
  return {
    select() {
      return {
        from(table) {
          return {
            where(condition) {
              if (table === pipelineReviewQueue) {
                return Promise.resolve(queueItemFixture ? [queueItemFixture] : []);
              }
              if (table === pipelineCurriculumVersions) {
                return Promise.resolve(versionsTable.filter((r) => matches(r, condition)));
              }
              return Promise.resolve([]);
            },
          };
        },
      };
    },
    update(table) {
      return {
        set(values) {
          return {
            where(condition) {
              const matchedIds = [];
              if (table === pipelineCurriculumVersions) {
                versionsTable = versionsTable.map((r) => {
                  if (matches(r, condition)) {
                    matchedIds.push(r.id);
                    return { ...r, ...values };
                  }
                  return r;
                });
              }
              updateCalls.push({ table, values, matchedIds });
              return Promise.resolve(undefined);
            },
          };
        },
      };
    },
    insert(table) {
      return {
        values(values) {
          insertCalls.push({ table, values });
          return Promise.resolve(undefined);
        },
      };
    },
    // approveReview/rejectReview no longer build their writes through
    // Drizzle's update()/where() builder (Phase 3.5B-3A moved them to a
    // single writable-CTE db.execute(sql`...`) statement so the
    // pending-check itself is the concurrency authority — see actions.ts).
    // The real eq/and/ne WHERE-walking technique above no longer applies
    // (there is no query-builder `condition` object for a raw sql
    // template), so this mock evaluates the CTE's own documented scoping
    // rule directly against the in-memory versionsTable — same program,
    // status = 'approved', excluding the just-approved id — which is the
    // exact rule under test by the sibling-deprecation cases below, and
    // matches the WHERE clause actually written in actions.ts.
    async execute(sqlObj) {
      const text = sqlObj.queryChunks
        .filter((c) => c?.constructor?.name === "StringChunk")
        .map((c) => (Array.isArray(c.value) ? c.value.join("") : String(c.value)))
        .join("?");
      const params = sqlObj.queryChunks.filter((c) => c?.constructor?.name !== "StringChunk");

      const won = () =>
        queueItemFixture &&
        queueItemFixture.id === params[2] &&
        queueItemFixture.status === "pending" &&
        queueItemFixture.curriculumVersionId === params[3];

      if (text.includes("pipeline.review.approve")) {
        if (!won()) return { rows: [] };
        // 10 params: now, userId, queueId, targetVersionId, now, now,
        // auditId, userId, queueId, meta (audit_log.id is now explicitly
        // generated — see actions.ts's approveReview comment).
        const [now, userId, queueId, targetVersionId, , , , , , meta] = params;

        queueItemFixture = { ...queueItemFixture, status: "approved", reviewedAt: now, reviewedBy: userId };

        const target = versionsTable.find((v) => v.id === targetVersionId);
        const programId = target?.programId;
        versionsTable = versionsTable.map((v) => {
          if (v.id === targetVersionId) return { ...v, status: "approved", updatedAt: now };
          if (v.programId === programId && v.status === "approved") {
            return { ...v, status: "deprecated", updatedAt: now };
          }
          return v;
        });

        insertCalls.push({ table: auditLogs, values: { userId, action: "pipeline.review.approve", target: queueId, meta } });
        return { rows: [{ id: "audit-1" }] };
      }

      if (text.includes("pipeline.review.reject")) {
        if (!won()) return { rows: [] };
        // 9 params: now, userId, queueId, targetVersionId, now, auditId,
        // userId, queueId, meta.
        const [now, userId, queueId, targetVersionId, , , , , meta] = params;

        queueItemFixture = { ...queueItemFixture, status: "rejected", reviewedAt: now, reviewedBy: userId };
        versionsTable = versionsTable.map((v) =>
          v.id === targetVersionId ? { ...v, status: "deprecated", updatedAt: now } : v
        );

        insertCalls.push({ table: auditLogs, values: { userId, action: "pipeline.review.reject", target: queueId, meta } });
        return { rows: [{ id: "audit-1" }] };
      }

      throw new Error("Unrecognized query shape in mock");
    },
    // publishCurriculum still batches its (upsert + audit insert) pair.
    async batch(items) {
      return Promise.all(items);
    },
  };
}

let resolveAdminMock = async () => ({ ok: false, mode: "rbac", reason: "signin" });
let authMock = async () => null;
// Phase 3.5B-2: renamed, and now returns a prepared (unexecuted) upsert for
// the caller to submit via db.batch() alongside the audit insert.
// `upsert: Promise.resolve(undefined)` is a safe stand-in here since this
// file's fakeDb().batch() just does Promise.all(items).
let compilePublishMock = async () => ({
  country: "jordan",
  university: "ju",
  specialization: "computer-science",
  upsert: Promise.resolve(undefined),
  overwrite: null,
});

mock.module("@/db", { exports: { requireDb: () => fakeDb() } });
mock.module("@/lib/admin-access", { exports: { resolveAdmin: (...a) => resolveAdminMock(...a) } });
mock.module("@/auth", { exports: { auth: (...a) => authMock(...a) } });
mock.module("@/lib/curriculum/extraction/compiler", {
  exports: { prepareCurriculumPublish: (...a) => compilePublishMock(...a) },
});
mock.module("next/cache", {
  exports: { revalidatePath: (p) => revalidatePathCalls.push(p) },
});

const { approveReview, rejectReview, publishCurriculum } = await import(
  "../src/app/admin/pipeline/review/[id]/actions.js"
);

const PENDING_QUEUE_ITEM = {
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

function auditInserts() {
  return insertCalls.filter((c) => c.table === auditLogs);
}

async function assertForbidden(call) {
  await assert.rejects(call, /Forbidden/);
}

// ── 1-3: unauthorized — zero mutations, zero audit events ────────────────

test("approveReview: unauthorized → Forbidden, zero mutation, zero audit event", async () => {
  resolveAdminMock = async () => ({ ok: false, mode: "rbac", reason: "signin" });
  queueItemFixture = { ...PENDING_QUEUE_ITEM };
  resetState();
  queueItemFixture = { ...PENDING_QUEUE_ITEM };

  await assertForbidden(approveReview("queue-1", "version-A2"));
  assert.strictEqual(updateCalls.length, 0);
  assert.strictEqual(auditInserts().length, 0);
});

test("rejectReview: unauthorized → Forbidden, zero mutation, zero audit event", async () => {
  resolveAdminMock = async () => ({ ok: false, mode: "rbac", reason: "signin" });
  resetState();
  queueItemFixture = { ...PENDING_QUEUE_ITEM };

  await assertForbidden(rejectReview("queue-1", "version-A2"));
  assert.strictEqual(updateCalls.length, 0);
  assert.strictEqual(auditInserts().length, 0);
});

test("publishCurriculum: unauthorized → Forbidden, compiler never reached, zero audit event", async () => {
  resolveAdminMock = async () => ({ ok: false, mode: "rbac", reason: "signin" });
  resetState();
  let compileCalls = 0;
  compilePublishMock = async () => {
    compileCalls++;
    return { country: "x", university: "y", specialization: "z", overwrite: null };
  };

  await assertForbidden(publishCurriculum("version-A2"));
  assert.strictEqual(compileCalls, 0);
  assert.strictEqual(auditInserts().length, 0);
});

// ── 4-6: successful actions produce exactly one audit event ──────────────

test("approveReview: success → exactly one pipeline.review.approve audit event", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "writer" });
  authMock = async () => ({ user: { id: "user-1" } });
  resetState();
  queueItemFixture = { ...PENDING_QUEUE_ITEM };
  versionsTable = [{ id: "version-A2", programId: "program-A", status: "draft", updatedAt: new Date() }];

  await approveReview("queue-1", "version-A2");

  const audits = auditInserts();
  assert.strictEqual(audits.length, 1);
  assert.strictEqual(audits[0].values.action, "pipeline.review.approve");
  assert.strictEqual(audits[0].values.target, "queue-1");
  assert.strictEqual(audits[0].values.userId, "user-1");
  const meta = JSON.parse(audits[0].values.meta);
  assert.strictEqual(meta.versionId, "version-A2");
  assert.strictEqual(meta.previousStatus, "pending");
  assert.strictEqual(meta.newStatus, "approved");
  assert.strictEqual(meta.programId, "program-A");
});

test("rejectReview: success → exactly one pipeline.review.reject audit event", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "writer" });
  authMock = async () => ({ user: { id: "user-1" } });
  resetState();
  queueItemFixture = { ...PENDING_QUEUE_ITEM };

  await rejectReview("queue-1", "version-A2");

  const audits = auditInserts();
  assert.strictEqual(audits.length, 1);
  assert.strictEqual(audits[0].values.action, "pipeline.review.reject");
  assert.strictEqual(audits[0].values.target, "queue-1");
  const meta = JSON.parse(audits[0].values.meta);
  assert.strictEqual(meta.previousStatus, "pending");
  assert.strictEqual(meta.newStatus, "rejected");
});

test("publishCurriculum: success → exactly one pipeline.curriculum.publish audit event", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });
  authMock = async () => ({ user: { id: "user-owner" } });
  resetState();
  compilePublishMock = async () => ({
    country: "jordan",
    university: "ju",
    specialization: "computer-science",
    upsert: Promise.resolve(undefined),
    overwrite: null,
  });

  await publishCurriculum("version-A2");

  const audits = auditInserts();
  assert.strictEqual(audits.length, 1);
  assert.strictEqual(audits[0].values.action, "pipeline.curriculum.publish");
  assert.strictEqual(audits[0].values.target, "version-A2");
  const meta = JSON.parse(audits[0].values.meta);
  assert.strictEqual(meta.country, "jordan");
  assert.strictEqual(meta.university, "ju");
  assert.strictEqual(meta.specialization, "computer-science");
  assert.strictEqual(meta.overwrite, null);
});

// ── 7: failed mutation never produces a false-success audit event ────────

test("approveReview: queue item not pending → throws, zero audit event", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });
  authMock = async () => ({ user: { id: "user-owner" } });
  resetState();
  queueItemFixture = { ...PENDING_QUEUE_ITEM, status: "approved" };

  await assert.rejects(approveReview("queue-1", "version-A2"), /not pending/);
  assert.strictEqual(auditInserts().length, 0);
});

test("rejectReview: version mismatch → throws, zero audit event", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });
  authMock = async () => ({ user: { id: "user-owner" } });
  resetState();
  queueItemFixture = { ...PENDING_QUEUE_ITEM };

  await assert.rejects(rejectReview("queue-1", "wrong-version"), /Version mismatch/);
  assert.strictEqual(auditInserts().length, 0);
});

test("publishCurriculum: compiler throws → caught, {success:false}, zero audit event", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });
  authMock = async () => ({ user: { id: "user-owner" } });
  resetState();
  compilePublishMock = async () => {
    throw new Error("Cannot publish a curriculum version that is not approved");
  };

  const result = await publishCurriculum("version-A2");
  assert.strictEqual(result.success, false);
  assert.strictEqual(auditInserts().length, 0);
});

// ── 8: ADMIN_TOKEN fallback — userId is null, matching repo convention ───

test("approveReview: ADMIN_TOKEN fallback (no session) → audit userId is null", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "token", role: "owner" });
  authMock = async () => null; // no session in token fallback mode
  resetState();
  queueItemFixture = { ...PENDING_QUEUE_ITEM };
  versionsTable = [{ id: "version-A2", programId: "program-A", status: "draft", updatedAt: new Date() }];

  await approveReview("queue-1", "version-A2");

  assert.strictEqual(auditInserts()[0].values.userId, null);
});

// ── 16-20: sibling-version deprecation on approve ─────────────────────────

test("approving A2 deprecates sibling A1 (same program, previously approved)", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });
  authMock = async () => ({ user: { id: "user-owner" } });
  resetState();
  queueItemFixture = { ...PENDING_QUEUE_ITEM, curriculumVersionId: "version-A2" };
  versionsTable = [
    { id: "version-A1", programId: "program-A", status: "approved", updatedAt: new Date() },
    { id: "version-A2", programId: "program-A", status: "draft", updatedAt: new Date() },
  ];

  await approveReview("queue-1", "version-A2");

  const a1 = versionsTable.find((r) => r.id === "version-A1");
  const a2 = versionsTable.find((r) => r.id === "version-A2");
  assert.strictEqual(a1.status, "deprecated"); // test 16
  assert.strictEqual(a2.status, "approved"); // test 20: never deprecates itself
});

test("draft sibling of the same program is left untouched (not deprecated)", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });
  authMock = async () => ({ user: { id: "user-owner" } });
  resetState();
  queueItemFixture = { ...PENDING_QUEUE_ITEM, curriculumVersionId: "version-A2" };
  versionsTable = [
    { id: "version-A0", programId: "program-A", status: "draft", updatedAt: new Date() },
    { id: "version-A2", programId: "program-A", status: "draft", updatedAt: new Date() },
  ];

  await approveReview("queue-1", "version-A2");

  const a0 = versionsTable.find((r) => r.id === "version-A0");
  assert.strictEqual(a0.status, "draft"); // test 17
});

test("already-deprecated sibling stays deprecated", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });
  authMock = async () => ({ user: { id: "user-owner" } });
  resetState();
  queueItemFixture = { ...PENDING_QUEUE_ITEM, curriculumVersionId: "version-A2" };
  versionsTable = [
    { id: "version-A0", programId: "program-A", status: "deprecated", updatedAt: new Date() },
    { id: "version-A2", programId: "program-A", status: "draft", updatedAt: new Date() },
  ];

  await approveReview("queue-1", "version-A2");

  const a0 = versionsTable.find((r) => r.id === "version-A0");
  assert.strictEqual(a0.status, "deprecated"); // test 18 — unchanged, still deprecated
});

test("approved version of a DIFFERENT program is never touched", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });
  authMock = async () => ({ user: { id: "user-owner" } });
  resetState();
  queueItemFixture = { ...PENDING_QUEUE_ITEM, curriculumVersionId: "version-A2" };
  versionsTable = [
    { id: "version-A2", programId: "program-A", status: "draft", updatedAt: new Date() },
    { id: "version-B1", programId: "program-B", status: "approved", updatedAt: new Date() },
  ];

  await approveReview("queue-1", "version-A2");

  const b1 = versionsTable.find((r) => r.id === "version-B1");
  assert.strictEqual(b1.status, "approved"); // test 19 — untouched
});

test("rejectReview never triggers sibling deprecation logic", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });
  authMock = async () => ({ user: { id: "user-owner" } });
  resetState();
  queueItemFixture = { ...PENDING_QUEUE_ITEM, curriculumVersionId: "version-A2" };
  versionsTable = [
    { id: "version-A1", programId: "program-A", status: "approved", updatedAt: new Date() },
    { id: "version-A2", programId: "program-A", status: "draft", updatedAt: new Date() },
  ];

  await rejectReview("queue-1", "version-A2");

  const a1 = versionsTable.find((r) => r.id === "version-A1");
  assert.strictEqual(a1.status, "approved"); // untouched — reject behavior unchanged
});

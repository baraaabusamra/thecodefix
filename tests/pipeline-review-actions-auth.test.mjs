import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";
import {
  pipelineReviewQueue,
  pipelineCurriculumVersions,
} from "../src/db/schema.js";

// src/app/admin/pipeline/review/[id]/actions.ts calls resolveAdmin()/can()
// and re-derives the queue item server-side before any mutation. All
// collaborators below are mocked so this suite never hits a real database,
// never calls prepareCurriculumPublish (and therefore never reaches any
// Anthropic/Gemini/Tavily path), and never touches next/cache's real
// request-scoped internals.

const updateCalls = []; // { table, values }
const selectCalls = []; // { table }
const insertCalls = []; // { table, values } — Phase 3 added auditLogs inserts
const compilePublishCalls = []; // [versionId]
const revalidatePathCalls = [];

function resetCallLogs() {
  updateCalls.length = 0;
  selectCalls.length = 0;
  insertCalls.length = 0;
  compilePublishCalls.length = 0;
  revalidatePathCalls.length = 0;
}

// Per-test fixture: what the mocked SELECT on pipelineReviewQueue returns.
let queueItemFixture = null;
// Phase 3's approveReview looks up the version row (for sibling
// deprecation's programId) — every test here uses "version-1", so one
// static fixture covers all of them.
const versionRowFixture = { id: "version-1", programId: "program-1", status: "draft" };

function fakeDb() {
  return {
    select() {
      return {
        from(table) {
          return {
            where() {
              selectCalls.push({ table });
              if (table === pipelineReviewQueue) {
                return Promise.resolve(queueItemFixture ? [queueItemFixture] : []);
              }
              if (table === pipelineCurriculumVersions) {
                return Promise.resolve([versionRowFixture]);
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
            where() {
              updateCalls.push({ table, values });
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
    // approveReview/rejectReview no longer use db.batch() for their own
    // writes (Phase 3.5B-3A moved them to a single writable-CTE statement
    // via db.execute(sql`...`), to make the pending-check itself the
    // concurrency authority — see actions.ts's comment on approveReview).
    // This file only tests authorization/state-machine behavior, never
    // concurrent races (that's tests/pipeline-review-concurrency.test.mjs),
    // so every queue item here is already known-matching by the time
    // execute() would be reached — the mock re-derives equivalent
    // updateCalls entries from the CTE's own bound parameters so the
    // existing "which table, which values" assertions below still hold
    // without needing to be rewritten.
    async execute(sqlObj) {
      const text = sqlObj.queryChunks
        .filter((c) => c?.constructor?.name === "StringChunk")
        .map((c) => (Array.isArray(c.value) ? c.value.join("") : String(c.value)))
        .join("?");
      const params = sqlObj.queryChunks.filter((c) => c?.constructor?.name !== "StringChunk");

      if (text.includes("pipeline.review.approve")) {
        const [now, userId] = params;
        updateCalls.push({ table: pipelineReviewQueue, values: { status: "approved", reviewedAt: now, reviewedBy: userId } });
        updateCalls.push({ table: pipelineCurriculumVersions, values: { status: "approved", updatedAt: now } });
        updateCalls.push({ table: pipelineCurriculumVersions, values: { status: "deprecated", updatedAt: now } });
        return { rows: [{ id: "audit-1" }] };
      }
      if (text.includes("pipeline.review.reject")) {
        const [now, userId] = params;
        updateCalls.push({ table: pipelineReviewQueue, values: { status: "rejected", reviewedAt: now, reviewedBy: userId } });
        updateCalls.push({ table: pipelineCurriculumVersions, values: { status: "deprecated", updatedAt: now } });
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

mock.module("@/db", {
  exports: { requireDb: () => fakeDb() },
});

mock.module("@/lib/admin-access", {
  exports: { resolveAdmin: (...args) => resolveAdminMock(...args) },
});

mock.module("@/auth", {
  exports: { auth: (...args) => authMock(...args) },
});

mock.module("@/lib/curriculum/extraction/compiler", {
  exports: {
    // Phase 3.5B-2: renamed, and now returns a prepared (unexecuted) upsert
    // for the caller to submit via db.batch() alongside the audit insert.
    // `upsert: Promise.resolve(undefined)` is a safe stand-in here since
    // this file's fakeDb().batch() just does Promise.all(items).
    prepareCurriculumPublish: async (versionId) => {
      compilePublishCalls.push(versionId);
      return {
        country: "x",
        university: "y",
        specialization: "z",
        upsert: Promise.resolve(undefined),
        overwrite: null,
      };
    },
  },
});

mock.module("next/cache", {
  exports: {
    revalidatePath: (path) => {
      revalidatePathCalls.push(path);
    },
  },
});

const { approveReview, rejectReview, publishCurriculum } = await import(
  "../src/app/admin/pipeline/review/[id]/actions.js"
);

const PENDING_QUEUE_ITEM = {
  id: "queue-1",
  curriculumVersionId: "version-1",
  extractionRunId: "run-1",
  reason: "no official source",
  status: "pending",
  reviewedBy: null,
  reviewedAt: null,
  reviewNotes: null,
  createdAt: new Date(),
};

function setQueueFixture(overrides) {
  queueItemFixture = { ...PENDING_QUEUE_ITEM, ...overrides };
}

async function assertForbidden(call) {
  await assert.rejects(call, /Forbidden/);
}

function assertNoMutations() {
  assert.strictEqual(updateCalls.length, 0, "no DB update must occur");
}

function assertNoPublish() {
  assert.strictEqual(
    compilePublishCalls.length,
    0,
    "prepareCurriculumPublish (the paid Gemini/Anthropic-reaching path) must not be reached"
  );
}

// ── 1 & 2: approveReview — unauthenticated / wrong role ──────────────────

test("approveReview: unauthenticated caller is forbidden, zero DB mutations", async () => {
  resolveAdminMock = async () => ({ ok: false, mode: "rbac", reason: "signin" });
  setQueueFixture({});
  resetCallLogs();
  await assertForbidden(approveReview("queue-1", "version-1"));
  assertNoMutations();
  assert.strictEqual(selectCalls.length, 0, "must not even read the queue item");
});

test("approveReview: wrong role is forbidden, zero DB mutations", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "operations" });
  setQueueFixture({});
  resetCallLogs();
  await assertForbidden(approveReview("queue-1", "version-1"));
  assertNoMutations();
});

// ── 3: authorized writer/admin/owner, pending + matching version → succeeds ─

for (const role of ["writer", "admin", "owner"]) {
  test(`approveReview: authorized ${role} with pending queue + matching version succeeds`, async () => {
    resolveAdminMock = async () => ({ ok: true, mode: "rbac", role });
    authMock = async () => ({ user: { id: `user-${role}` } });
    setQueueFixture({ status: "pending", curriculumVersionId: "version-1" });
    resetCallLogs();

    const result = await approveReview("queue-1", "version-1");

    assert.deepStrictEqual(result, { success: true });
    // 3 updates as of Phase 3: queue status, version approve, and the
    // sibling-deprecation statement (issued unconditionally; scoping
    // correctness is covered separately in
    // tests/pipeline-review-actions-governance.test.mjs).
    assert.strictEqual(updateCalls.length, 3);
    assert.strictEqual(updateCalls[0].table, pipelineReviewQueue);
    assert.strictEqual(updateCalls[0].values.status, "approved");
    assert.strictEqual(updateCalls[1].table, pipelineCurriculumVersions);
    assert.strictEqual(updateCalls[1].values.status, "approved");
  });
}

// ── 4: rejectReview — unauthorized ────────────────────────────────────────

test("rejectReview: unauthorized caller is forbidden, zero DB mutations", async () => {
  resolveAdminMock = async () => ({ ok: false, mode: "rbac", reason: "signin" });
  setQueueFixture({});
  resetCallLogs();
  await assertForbidden(rejectReview("queue-1", "version-1"));
  assertNoMutations();
});

// ── 5 & 6: publishCurriculum — unauthorized / authorized ──────────────────

test("publishCurriculum: unauthorized caller is forbidden, compiler never called", async () => {
  resolveAdminMock = async () => ({ ok: false, mode: "rbac", reason: "signin" });
  resetCallLogs();
  await assertForbidden(publishCurriculum("version-1"));
  assertNoPublish();
});

test("publishCurriculum: authorized caller calls the compiler exactly once", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });
  authMock = async () => ({ user: { id: "user-owner" } });
  resetCallLogs();

  const result = await publishCurriculum("version-1");

  assert.deepStrictEqual(result, { success: true });
  assert.strictEqual(compilePublishCalls.length, 1);
  assert.strictEqual(compilePublishCalls[0], "version-1");
});

// ── 7 & 8: reject actions on a queue item that's already approved/rejected ─

for (const action of [
  { name: "approveReview", fn: approveReview },
  { name: "rejectReview", fn: rejectReview },
]) {
  for (const priorStatus of ["approved", "rejected"]) {
    test(`${action.name}: rejects a queue item already ${priorStatus}`, async () => {
      resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });
      authMock = async () => ({ user: { id: "user-owner" } });
      setQueueFixture({ status: priorStatus, curriculumVersionId: "version-1" });
      resetCallLogs();

      await assert.rejects(action.fn("queue-1", "version-1"), /not pending/);
      assertNoMutations();
    });
  }
}

// ── 9 & 10: version mismatch (IDOR) ───────────────────────────────────────

for (const action of [
  { name: "approveReview", fn: approveReview },
  { name: "rejectReview", fn: rejectReview },
]) {
  test(`${action.name}: rejects when supplied versionId does not match the queue item's curriculumVersionId`, async () => {
    resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });
    authMock = async () => ({ user: { id: "user-owner" } });
    setQueueFixture({ status: "pending", curriculumVersionId: "version-1" });
    resetCallLogs();

    await assert.rejects(action.fn("queue-1", "version-ATTACKER"), /Version mismatch/);
    assertNoMutations();
  });
}

// ── 11: reviewedBy is populated with the authenticated user's real id ─────

test("approveReview: reviewedBy is set from the authenticated session's user id", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "writer" });
  authMock = async () => ({ user: { id: "real-user-id-42" } });
  setQueueFixture({ status: "pending", curriculumVersionId: "version-1" });
  resetCallLogs();

  await approveReview("queue-1", "version-1");

  assert.strictEqual(updateCalls[0].table, pipelineReviewQueue);
  assert.strictEqual(updateCalls[0].values.reviewedBy, "real-user-id-42");
});

test("rejectReview: reviewedBy is null in ADMIN_TOKEN fallback mode (no session user)", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "token", role: "owner" });
  authMock = async () => null; // no session in token fallback mode
  setQueueFixture({ status: "pending", curriculumVersionId: "version-1" });
  resetCallLogs();

  await rejectReview("queue-1", "version-1");

  assert.strictEqual(updateCalls[0].table, pipelineReviewQueue);
  assert.strictEqual(updateCalls[0].values.reviewedBy, null);
});

// ── 12: authorization strictly precedes every mutation / external call ───

test("authorization precedes DB reads and mutations for all three actions when forbidden", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "support" }); // lacks content:edit
  setQueueFixture({ status: "pending", curriculumVersionId: "version-1" });

  resetCallLogs();
  await assertForbidden(approveReview("queue-1", "version-1"));
  assert.strictEqual(selectCalls.length, 0);
  assertNoMutations();

  resetCallLogs();
  await assertForbidden(rejectReview("queue-1", "version-1"));
  assert.strictEqual(selectCalls.length, 0);
  assertNoMutations();

  resetCallLogs();
  await assertForbidden(publishCurriculum("version-1"));
  assertNoPublish();
});

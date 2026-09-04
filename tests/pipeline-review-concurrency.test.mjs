import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";

// Phase 3.5B-3A fix (P1-D1): approveReview/rejectReview now perform their
// pending→(approved|rejected) transition and all dependent writes as ONE
// writable-CTE Postgres statement via db.execute(sql`...`), replacing the
// db.batch() approach for these two functions specifically. This closes the
// same-queue-item race Phase 3.5A/3.5B-1 left open: db.batch() made each
// call's OWN writes atomic against ITS OWN partial failure, but never made
// the pending pre-read a lock — two concurrent callers could both pass the
// pre-read and both submit a batch that unconditionally matched `WHERE id
// = queueId`. The CAS condition now lives in the mutating statement itself.
//
// HONESTY NOTE on what this suite can and cannot prove: it cannot execute
// real Postgres, so it cannot itself verify the CTE's SQL is syntactically
// valid or that Postgres's snapshot-isolation semantics behave as reasoned
// about in the implementation's comments — that rests on Postgres's own
// documented, language-level guarantee that a single SQL statement is
// atomic, not on anything empirically provable here. What this suite DOES
// prove: the application correctly interprets the statement's result (zero
// rows = lost the race, one row = won) and behaves correctly either way —
// no double audit, no attribution overwrite, no mutation from a losing
// call, and no poison state after a genuine failure. The mock replicates
// the CAS condition in JS specifically to exercise that application logic
// under a scripted "two callers, one relevant DB row" scenario.

let queueRow = null; // { id, status, curriculumVersionId, reviewedBy, reviewedAt }
let versionsTable = []; // [{ id, programId, status, updatedAt }]
let auditRows = []; // [{ userId, action, target, meta }]
let executeCalls = 0;
let shouldFail = false;

// Gate queue: execute() pushes { resolve, sqlObj } and awaits its own
// resolver, so a test can deterministically control the ORDER in which two
// truly-concurrent calls actually commit — without any real timing/sleep.
// Entries carry sqlObj so a test can identify WHICH pending call is which
// (approve's and reject's pre-read paths differ in length, so which call
// reaches the gate first is not reliably predictable from call order).
let gatesEnabled = false;
let gateQueue = []; // [{ resolve, sqlObj }]

// FIFO queue of user ids consumed by the mocked auth() — lets two
// concurrently-started calls each get their own correct caller identity
// even though both run assertReviewAccess() (resolveAdmin + auth) before
// either reaches the gated execute() call. Falls back to a fixed id when
// not populated (sequential, non-concurrency tests).
let authQueue = null;
let fixedAuthUserId = "user-owner";

function resetState() {
  executeCalls = 0;
  shouldFail = false;
  auditRows = [];
  gatesEnabled = false;
  gateQueue = [];
  authQueue = null;
  fixedAuthUserId = "user-owner";
}

// Waits for all currently-pending microtasks (and one macrotask tick) to
// drain — deterministic "let everything that can run right now, run",
// not a timing-based sleep. Used to let two concurrently-started calls
// both reach their gated execute() before either is released.
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

function applyApprove(now, userId, queueId, targetVersionId) {
  queueRow.status = "approved";
  queueRow.reviewedAt = now;
  queueRow.reviewedBy = userId;
  const target = versionsTable.find((v) => v.id === targetVersionId);
  target.status = "approved";
  target.updatedAt = now;
  for (const v of versionsTable) {
    if (v.id !== targetVersionId && v.programId === target.programId && v.status === "approved") {
      v.status = "deprecated";
      v.updatedAt = now;
    }
  }
}

function applyReject(now, userId, targetVersionId) {
  queueRow.status = "rejected";
  queueRow.reviewedAt = now;
  queueRow.reviewedBy = userId;
  const target = versionsTable.find((v) => v.id === targetVersionId);
  target.status = "deprecated";
  target.updatedAt = now;
}

const { pipelineReviewQueue, pipelineCurriculumVersions } = await import("../src/db/schema.js");

function fakeDb() {
  return {
    select() {
      return {
        from(table) {
          return {
            where() {
              // Both pre-read SELECTs (queue, then version) return whatever
              // the current in-memory row is — modeling exactly "the
              // pre-read is not the concurrency authority": it can observe
              // pending right up until the atomic statement below runs.
              if (table === pipelineReviewQueue) {
                return Promise.resolve(queueRow ? [queueRow] : []);
              }
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
      executeCalls++;
      if (gatesEnabled) {
        await new Promise((resolve) => gateQueue.push({ resolve, sqlObj }));
      }
      if (shouldFail) {
        throw new Error("INJECTED_DB_FAILURE");
      }

      const text = fullText(sqlObj);
      const params = extractParams(sqlObj);
      const isApprove = text.includes("pipeline.review.approve");
      const isReject = text.includes("pipeline.review.reject");

      if (isApprove) {
        const [now, userId, queueId, targetVersionId] = params;
        const won =
          queueRow &&
          queueRow.id === queueId &&
          queueRow.status === "pending" &&
          queueRow.curriculumVersionId === targetVersionId;
        if (!won) return { rows: [] };
        applyApprove(now, userId, queueId, targetVersionId);
        const [, , , , , , auditUserId, auditTarget, meta] = params;
        auditRows.push({ userId: auditUserId, action: "pipeline.review.approve", target: auditTarget, meta });
        return { rows: [{ id: `audit-${auditRows.length}` }] };
      }

      if (isReject) {
        const [now, userId, queueId, targetVersionId] = params;
        const won =
          queueRow &&
          queueRow.id === queueId &&
          queueRow.status === "pending" &&
          queueRow.curriculumVersionId === targetVersionId;
        if (!won) return { rows: [] };
        applyReject(now, userId, targetVersionId);
        const [, , , , , auditUserId, auditTarget, meta] = params;
        auditRows.push({ userId: auditUserId, action: "pipeline.review.reject", target: auditTarget, meta });
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

function setup({ withSibling = false } = {}) {
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
  versionsTable = [{ id: "version-1", programId: "program-A", status: "draft", updatedAt: new Date() }];
  if (withSibling) {
    versionsTable.push({ id: "version-A1", programId: "program-A", status: "approved", updatedAt: new Date() });
  }
}

// Starts two calls genuinely concurrently (neither awaited until both have
// run as far as they can) and waits for both to reach the gated
// db.execute() call — proving they both observed "pending" before either
// commits, exactly modeling "two callers that both performed the old
// pre-read while pending." Deterministic: flush() drains microtasks, it
// does not wait on a timer.
async function startConcurrentPair(fnA, userA, fnB, userB) {
  gatesEnabled = true;
  authQueue = [userA, userB];
  const pA = fnA("queue-1", "version-1");
  const pB = fnB("queue-1", "version-1");
  await flush();
  assert.strictEqual(
    gateQueue.length,
    2,
    "both concurrent calls must have reached the atomic statement (both observed pending) before either commits"
  );
  return { pA, pB };
}

// Releases whichever gated call's SQL text contains the given action name —
// used when the two racing calls are different actions (approve vs reject),
// so the test can deterministically choose which one commits first.
function releaseGateFor(actionSubstring) {
  const idx = gateQueue.findIndex((g) => fullText(g.sqlObj).includes(actionSubstring));
  if (idx === -1) throw new Error(`No gated call pending for: ${actionSubstring}`);
  gateQueue.splice(idx, 1)[0].resolve();
}

// Releases the gated call at a raw index — used when the two racing calls
// are the SAME action (approve vs approve, reject vs reject) and are
// therefore symmetric: it genuinely doesn't matter which one is "first",
// only that exactly one wins and exactly one loses.
function releaseGateAt(index) {
  const entry = gateQueue.splice(index, 1)[0];
  if (!entry) throw new Error(`No gated call at index ${index}`);
  entry.resolve();
}

// ── 1: approve vs approve — exactly one wins ──────────────────────────────

test("approve vs approve: exactly one transition wins, loser gets a conflict error and mutates nothing", async () => {
  resetState();
  setup();

  const { pA, pB } = await startConcurrentPair(approveReview, "user-A", approveReview, "user-B");
  releaseGateAt(0);
  releaseGateAt(0);

  const [resA, resB] = await Promise.allSettled([pA, pB]);
  const outcomes = [resA, resB];
  const fulfilled = outcomes.filter((r) => r.status === "fulfilled");
  const failed = outcomes.filter((r) => r.status === "rejected");
  assert.strictEqual(fulfilled.length, 1, "exactly one request must succeed");
  assert.strictEqual(failed.length, 1, "exactly one request must fail");
  assert.match(failed[0].reason.message, /no longer pending/);

  assert.strictEqual(queueRow.status, "approved");
  assert.ok(["user-A", "user-B"].includes(queueRow.reviewedBy), "reviewedBy reflects whichever call actually won");
  assert.strictEqual(versionsTable[0].status, "approved");
  assert.strictEqual(auditRows.length, 1, "exactly one approve audit row");
  assert.strictEqual(auditRows[0].action, "pipeline.review.approve");
});

// ── 2: approve vs reject, both orders ──────────────────────────────────────

test("approve vs reject: approve wins first → queue=approved, version=approved, only approve audit", async () => {
  resetState();
  setup();

  const { pA, pB } = await startConcurrentPair(approveReview, "user-A", rejectReview, "user-B");
  releaseGateFor("pipeline.review.approve");
  releaseGateFor("pipeline.review.reject");

  const [resA, resB] = await Promise.allSettled([pA, pB]);
  assert.strictEqual(resA.status, "fulfilled");
  assert.deepStrictEqual(resA.value, { success: true });
  assert.strictEqual(resB.status, "rejected");
  assert.match(resB.reason.message, /no longer pending/);

  assert.strictEqual(queueRow.status, "approved");
  assert.strictEqual(queueRow.reviewedBy, "user-A", "loser (reject) must not overwrite reviewedBy");
  assert.strictEqual(versionsTable[0].status, "approved", "loser must not deprecate the version");
  assert.strictEqual(auditRows.length, 1);
  assert.strictEqual(auditRows[0].action, "pipeline.review.approve");
});

test("approve vs reject: reject wins first → queue=rejected, version=deprecated, only reject audit", async () => {
  resetState();
  setup();

  const { pA, pB } = await startConcurrentPair(approveReview, "user-A", rejectReview, "user-B");
  releaseGateFor("pipeline.review.reject");
  releaseGateFor("pipeline.review.approve");

  const [resA, resB] = await Promise.allSettled([pA, pB]);
  assert.strictEqual(resA.status, "rejected");
  assert.match(resA.reason.message, /no longer pending/);
  assert.strictEqual(resB.status, "fulfilled");
  assert.deepStrictEqual(resB.value, { success: true });

  assert.strictEqual(queueRow.status, "rejected");
  assert.strictEqual(queueRow.reviewedBy, "user-B", "loser (approve) must not overwrite reviewedBy");
  assert.strictEqual(versionsTable[0].status, "deprecated", "loser must not re-approve the version");
  assert.strictEqual(auditRows.length, 1);
  assert.strictEqual(auditRows[0].action, "pipeline.review.reject");
});

// ── 3: reject vs reject — exactly one wins ────────────────────────────────

test("reject vs reject: exactly one transition wins, exactly one reject audit", async () => {
  resetState();
  setup();

  const { pA, pB } = await startConcurrentPair(rejectReview, "user-A", rejectReview, "user-B");
  releaseGateAt(0);
  releaseGateAt(0);

  const [resA, resB] = await Promise.allSettled([pA, pB]);
  const outcomes = [resA, resB];
  assert.strictEqual(outcomes.filter((r) => r.status === "fulfilled").length, 1);
  assert.strictEqual(outcomes.filter((r) => r.status === "rejected").length, 1);

  assert.strictEqual(queueRow.status, "rejected");
  assert.ok(["user-A", "user-B"].includes(queueRow.reviewedBy));
  assert.strictEqual(auditRows.length, 1);
  assert.strictEqual(auditRows[0].action, "pipeline.review.reject");
});

// ── loser cannot deprecate siblings ───────────────────────────────────────

test("loser cannot deprecate siblings: sibling deprecation only ever comes from the winning call", async () => {
  resetState();
  setup({ withSibling: true });

  const { pA, pB } = await startConcurrentPair(approveReview, "user-A", approveReview, "user-B");
  releaseGateAt(0);
  releaseGateAt(0);
  await Promise.allSettled([pA, pB]);

  const sibling = versionsTable.find((v) => v.id === "version-A1");
  assert.strictEqual(sibling.status, "deprecated", "winner's sibling deprecation applied exactly once");
  assert.strictEqual(versionsTable[0].status, "approved");
  assert.strictEqual(auditRows.length, 1, "only the winner's audit row exists — loser never touched siblings or audit");
});

// ── 8/9/10: failure injection — the whole statement rolls back ───────────
// Mechanically identical in this mock because there is now only ONE
// statement: any failure anywhere in it means Postgres never commits any
// of it. Kept as three distinctly-named tests to trace against each
// required failure point from the spec, even though the code path is the
// same "the statement threw" case each time.

test("failure injection (queue claim / version mutation): entire statement rolls back, nothing changes", async () => {
  resetState();
  setup();
  shouldFail = true;

  await assert.rejects(approveReview("queue-1", "version-1"));

  assert.strictEqual(queueRow.status, "pending");
  assert.strictEqual(versionsTable[0].status, "draft");
  assert.strictEqual(auditRows.length, 0);
});

test("failure injection (sibling deprecation): entire statement rolls back, nothing changes", async () => {
  resetState();
  setup({ withSibling: true });
  shouldFail = true;

  await assert.rejects(approveReview("queue-1", "version-1"));

  assert.strictEqual(queueRow.status, "pending");
  assert.strictEqual(versionsTable[0].status, "draft");
  assert.strictEqual(versionsTable.find((v) => v.id === "version-A1").status, "approved", "sibling untouched");
  assert.strictEqual(auditRows.length, 0);
});

test("failure injection (audit insert): entire statement rolls back, nothing changes", async () => {
  resetState();
  setup();
  shouldFail = true;

  await assert.rejects(rejectReview("queue-1", "version-1"));

  assert.strictEqual(queueRow.status, "pending");
  assert.strictEqual(versionsTable[0].status, "draft");
  assert.strictEqual(auditRows.length, 0);
});

// ── 11: retry remains possible after a genuine DB failure ────────────────

test("retry after a genuine DB failure succeeds normally because the queue is still pending", async () => {
  resetState();
  setup();
  shouldFail = true;

  await assert.rejects(approveReview("queue-1", "version-1"));
  assert.strictEqual(queueRow.status, "pending", "no poison state after the failure");

  shouldFail = false;
  const retryResult = await approveReview("queue-1", "version-1");

  assert.deepStrictEqual(retryResult, { success: true });
  assert.strictEqual(queueRow.status, "approved");
  assert.strictEqual(versionsTable[0].status, "approved");
  assert.strictEqual(auditRows.length, 1);
});

// ── Security / IDOR regression: no raw SQL before authorization ──────────

test("unauthenticated caller: zero execute() calls", async () => {
  resetState();
  setup();
  resolveAdminMock = async () => ({ ok: false, mode: "rbac", reason: "signin" });

  await assert.rejects(approveReview("queue-1", "version-1"), /Forbidden/);

  assert.strictEqual(executeCalls, 0);
  assert.strictEqual(queueRow.status, "pending");
});

test("wrong role (lacks content:edit): zero execute() calls", async () => {
  resetState();
  setup();
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "operations" });

  await assert.rejects(rejectReview("queue-1", "version-1"), /Forbidden/);

  assert.strictEqual(executeCalls, 0);
  assert.strictEqual(queueRow.status, "pending");
});

test("queue/version mismatch (IDOR): zero execute() calls", async () => {
  resetState();
  setup();
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });

  await assert.rejects(approveReview("queue-1", "version-ATTACKER"), /Version mismatch/);

  assert.strictEqual(executeCalls, 0);
  assert.strictEqual(queueRow.status, "pending");
});

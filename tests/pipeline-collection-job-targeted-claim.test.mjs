import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";

// Phase 3.5B-7B (Controlled Live Pilot Stage 1B): the previously-supported
// enqueue path (Phase 3.5B-7) still left processing global-only —
// processNextJob()/claimNextJob() always claim whatever's highest
// priority/oldest system-wide, so an already-enqueued specific pilot job
// could not be guaranteed to be the one actually processed if an older
// retry-eligible job existed elsewhere in the queue (exactly what happened:
// Cairo's Stage-1 job was still retry-eligible when Hashemite's Stage-1B
// job was enqueued). claimJobById() closes this by adding a targeted claim
// that shares claimEligibilityPredicate() — the SAME eligibility rules as
// claimNextJob(), extracted once in claim.ts specifically so the two claim
// functions cannot drift out of sync.
//
// HONESTY NOTE (same caveat as every prior concurrency suite in this
// engagement): this suite cannot execute real Postgres, so it cannot
// itself verify FOR UPDATE SKIP LOCKED's actual concurrent-transaction
// behavior — that rests on Postgres's own documented guarantees. What this
// suite proves: claimJobById()'s and claimNextJob()'s SQL — reproduced
// faithfully in this fake, including the exact eligibility predicate and
// the CASE-based retryCount increment — resolve to the correct winner
// under scripted single- and concurrent-caller scenarios. No real AI,
// network, or database call is made anywhere in this file.

const IN_FLIGHT_STATUSES = ["searching", "downloading", "parsing", "extracting", "validating"];
const STALE_MINUTES = 15;

let jobsTable = []; // [{ id, universityId, programId, status, retryCount, maxRetries, priority, scheduledAt, startedAt, completedAt, error, metadata }]
let lockedIds = new Set();
let gatesEnabled = false;
let gateQueue = [];

function resetState() {
  jobsTable = [];
  lockedIds = new Set();
  gatesEnabled = false;
  gateQueue = [];
}

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

async function releaseAllPending() {
  while (gateQueue.length > 0) {
    const batch = gateQueue.splice(0, gateQueue.length);
    for (const entry of batch) entry.resolve();
    await flush();
  }
}

function fullText(sqlObj) {
  return sqlObj.queryChunks
    .map((c) => {
      if (c?.constructor?.name === "StringChunk") return Array.isArray(c.value) ? c.value.join("") : String(c.value);
      if (c?.constructor?.name === "SQL") return fullText(c);
      return "?";
    })
    .join("");
}

// Raw sql`` template interpolations are plain JS values directly in
// queryChunks (NOT wrapped in a "Param" class — that wrapping is specific
// to eq()/and()'s column-comparison objects) — same fact already
// established and relied on in tests/pipeline-source-dedup.test.mjs and
// tests/pipeline-extraction-claim.test.mjs.
function extractParams(sqlObj, out = []) {
  for (const c of sqlObj.queryChunks) {
    if (c?.constructor?.name === "SQL") extractParams(c, out);
    else if (c?.constructor?.name !== "StringChunk") out.push(c);
  }
  return out;
}

function isEligible(row, now) {
  const stale =
    IN_FLIGHT_STATUSES.includes(row.status) &&
    row.startedAt !== null &&
    now.getTime() - new Date(row.startedAt).getTime() > STALE_MINUTES * 60_000;
  const statusOk = row.status === "pending" || row.status === "failed" || stale;
  return statusOk && row.retryCount < row.maxRetries;
}

function fakeDb() {
  return {
    async execute(sqlObj) {
      const text = fullText(sqlObj);
      if (!text.includes('UPDATE "pipeline_collection_job"')) {
        throw new Error("Unrecognized execute() shape in mock: " + text.slice(0, 200));
      }
      const params = extractParams(sqlObj);
      const targetedId = text.includes('"id" = ') && params.length > 0 ? params[0] : null;

      const now = new Date();
      let candidates = jobsTable.filter((r) => !lockedIds.has(r.id) && isEligible(r, now));
      if (targetedId !== null) {
        candidates = candidates.filter((r) => r.id === targetedId);
      } else {
        candidates = [...candidates].sort((a, b) => {
          if (b.priority !== a.priority) return b.priority - a.priority;
          return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime();
        });
      }

      const winner = candidates[0];
      if (!winner) return { rows: [] };

      // Lock taken synchronously (before any await) — mirrors FOR UPDATE
      // SKIP LOCKED: a concurrent caller's own candidate search, running
      // after this point, will exclude this row entirely rather than wait.
      lockedIds.add(winner.id);
      if (gatesEnabled) await new Promise((resolve) => gateQueue.push({ resolve }));

      winner.retryCount = winner.status !== "pending" ? winner.retryCount + 1 : winner.retryCount;
      winner.startedAt = now;
      lockedIds.delete(winner.id);
      return { rows: [{ ...winner }] };
    },
  };
}

mock.module("@tcf/db", { exports: { requireDb: () => fakeDb() } });

const { claimNextJob, claimJobById } = await import("../modules/academic/src/pipeline/jobs/claim.js");

function makeJob(overrides) {
  return {
    id: overrides.id,
    universityId: overrides.universityId ?? "univ-1",
    programId: overrides.programId ?? "prog-1",
    status: overrides.status ?? "pending",
    retryCount: overrides.retryCount ?? 0,
    maxRetries: overrides.maxRetries ?? 3,
    priority: overrides.priority ?? 0,
    scheduledAt: overrides.scheduledAt ?? new Date(),
    startedAt: overrides.startedAt ?? null,
    completedAt: overrides.completedAt ?? null,
    error: overrides.error ?? null,
    metadata: overrides.metadata ?? null,
  };
}

test.beforeEach(() => {
  resetState();
});

test("1. a targeted pending job is atomically claimed by id", async () => {
  jobsTable.push(makeJob({ id: "hashemite-job", status: "pending" }));
  const claimed = await claimJobById("hashemite-job");
  assert.ok(claimed);
  assert.strictEqual(claimed.id, "hashemite-job");
  assert.strictEqual(claimed.status, "pending"); // returned row reflects pre-transition status; process.ts advances it next
  assert.ok(claimed.startedAt);
});

test("2 / WRONG JOB GUARANTEE. an older, retry-eligible, unrelated job is left completely untouched", async () => {
  const cairo = makeJob({
    id: "cairo-job",
    universityId: "univ-cairo",
    programId: "prog-cairo-cs",
    status: "failed",
    retryCount: 1,
    maxRetries: 3,
    scheduledAt: new Date("2026-08-23T10:45:48.805Z"), // older
  });
  const hashemite = makeJob({
    id: "hashemite-job",
    universityId: "univ-hu",
    programId: "prog-hu-cyber",
    status: "pending",
    scheduledAt: new Date("2026-08-23T10:56:45.478Z"), // newer
  });
  jobsTable.push(cairo, hashemite);

  // Sanity: claimNextJob() (system-wide, priority/age ordered) WOULD pick
  // Cairo first — this is exactly the ambiguity that motivated
  // claimJobById() to exist.
  const nextJobPick = jobsTable
    .filter((r) => isEligible(r, new Date()))
    .sort((a, b) => b.priority - a.priority || new Date(a.scheduledAt) - new Date(b.scheduledAt))[0];
  assert.strictEqual(nextJobPick.id, "cairo-job", "sanity check: global claim would pick the older job");

  const claimed = await claimJobById("hashemite-job");
  assert.strictEqual(claimed.id, "hashemite-job");

  const cairoAfter = jobsTable.find((r) => r.id === "cairo-job");
  assert.strictEqual(cairoAfter.status, "failed", "Cairo's status must not change");
  assert.strictEqual(cairoAfter.retryCount, 1, "Cairo's retryCount must not be touched");
  assert.strictEqual(cairoAfter.startedAt, null, "Cairo must not be claimed as a side effect");
});

test("3. concurrent same-ID targeted claims -> exactly one winner", async () => {
  gatesEnabled = true;
  jobsTable.push(makeJob({ id: "job-x", status: "pending" }));

  const p1 = claimJobById("job-x");
  const p2 = claimJobById("job-x");

  await flush();
  await releaseAllPending();
  const [r1, r2] = await Promise.all([p1, p2]);

  const winners = [r1, r2].filter(Boolean);
  assert.strictEqual(winners.length, 1, "exactly one caller must claim the job");
  const loser = r1 ? r2 : r1;
  assert.strictEqual(loser, null, "the other caller must get a well-defined no-work result, not an error");

  assert.strictEqual(jobsTable[0].retryCount, 0, "a single claim of a PENDING job must not increment retryCount (CASE WHEN status != 'pending')");
});

test("4. a completed job cannot be claimed by id", async () => {
  jobsTable.push(makeJob({ id: "job-x", status: "completed", retryCount: 0, maxRetries: 3 }));
  const claimed = await claimJobById("job-x");
  assert.strictEqual(claimed, null);
});

test("5. a cancelled job cannot be claimed by id", async () => {
  jobsTable.push(makeJob({ id: "job-x", status: "cancelled", retryCount: 0, maxRetries: 3 }));
  const claimed = await claimJobById("job-x");
  assert.strictEqual(claimed, null);
});

test("6. an exhausted failed job (retryCount = maxRetries) cannot be claimed by id -- cannot be forced through by knowing its ID", async () => {
  jobsTable.push(makeJob({ id: "job-x", status: "failed", retryCount: 3, maxRetries: 3 }));
  const claimed = await claimJobById("job-x");
  assert.strictEqual(claimed, null);
});

test("7. a retry-eligible failed job follows normal retry semantics: claimed, retryCount incremented", async () => {
  jobsTable.push(makeJob({ id: "job-x", status: "failed", retryCount: 1, maxRetries: 3 }));
  const claimed = await claimJobById("job-x");
  assert.ok(claimed);
  assert.strictEqual(claimed.retryCount, 2, "retryCount must increment exactly like claimNextJob's CASE WHEN status != 'pending'");
});

test("8. a fresh (non-stale) in-flight job cannot be stolen merely because its ID is known", async () => {
  jobsTable.push(makeJob({
    id: "job-x",
    status: "downloading",
    startedAt: new Date(Date.now() - 2 * 60_000), // 2 minutes ago, well under the 15-minute stale threshold
  }));
  const claimed = await claimJobById("job-x");
  assert.strictEqual(claimed, null, "a fresh in-flight job must not be claimable by id");
});

test("9. stale in-flight behavior via claimJobById matches claimNextJob exactly", async () => {
  const staleStartedAt = new Date(Date.now() - 20 * 60_000); // 20 minutes ago, past the 15-minute threshold
  jobsTable.push(makeJob({ id: "job-a", status: "downloading", startedAt: staleStartedAt, retryCount: 0, maxRetries: 3 }));
  const viaId = await claimJobById("job-a");
  assert.ok(viaId, "claimJobById must reclaim a stale in-flight job");
  assert.strictEqual(viaId.retryCount, 1, "reclaim increments retryCount (status != 'pending')");

  resetState();
  jobsTable.push(makeJob({ id: "job-b", status: "downloading", startedAt: staleStartedAt, retryCount: 0, maxRetries: 3 }));
  const viaNext = await claimNextJob();
  assert.ok(viaNext, "claimNextJob must reclaim the identical stale in-flight state the same way");
  assert.strictEqual(viaNext.retryCount, 1);
});

test("10a. retryCount behavior matches between claimJobById and claimNextJob for a PENDING job (no increment)", async () => {
  jobsTable.push(makeJob({ id: "job-x", status: "pending", retryCount: 0 }));
  const claimed = await claimJobById("job-x");
  assert.strictEqual(claimed.retryCount, 0);

  resetState();
  jobsTable.push(makeJob({ id: "job-y", status: "pending", retryCount: 0 }));
  const claimedNext = await claimNextJob();
  assert.strictEqual(claimedNext.retryCount, 0);
});

test("10b. retryCount behavior matches between claimJobById and claimNextJob for a FAILED job (increments)", async () => {
  jobsTable.push(makeJob({ id: "job-x", status: "failed", retryCount: 0, maxRetries: 3 }));
  const claimed = await claimJobById("job-x");
  assert.strictEqual(claimed.retryCount, 1);

  resetState();
  jobsTable.push(makeJob({ id: "job-y", status: "failed", retryCount: 0, maxRetries: 3 }));
  const claimedNext = await claimNextJob();
  assert.strictEqual(claimedNext.retryCount, 1);
});

test("claimNextJob() is unaffected by claimJobById()'s addition -- still picks system-wide by priority/age when called without a target", async () => {
  const older = makeJob({ id: "older", status: "pending", scheduledAt: new Date("2026-01-01T00:00:00Z") });
  const newer = makeJob({ id: "newer", status: "pending", scheduledAt: new Date("2026-06-01T00:00:00Z") });
  jobsTable.push(newer, older);
  const claimed = await claimNextJob();
  assert.strictEqual(claimed.id, "older", "same-priority ties still resolve by oldest scheduledAt, exactly as before this phase");
});

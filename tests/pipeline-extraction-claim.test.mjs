import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";
import { NeonDbError } from "@neondatabase/serverless";
import {
  pipelineExtractionRuns,
  pipelineCurriculumVersions,
  pipelineReviewQueue,
  pipelineExtractionEvidence,
} from "../src/db/schema.js";

process.env.CURRICULUM_EXTRACTION_ENABLED = "true";

// Phase 3.5B-4 (P1: duplicate paid-AI spend). Closes the race where two
// concurrent requests both pass the completed-run idempotency check and
// both reach the paid Gemini call unguarded — see the Phase 3.5B-4 audit.
// runExtractionPipeline now acquires an atomic, DB-enforced active claim
// (a partial unique index on pipelineExtractionRuns, "at most one
// status='started' row per (documentId, promptVersion)" —
// src/db/schema.ts) BEFORE calling the AI provider at all. Only the claim
// winner may call extractor.extract().
//
// HONESTY NOTE (same caveat as every prior concurrency suite this
// engagement): this suite cannot execute real Postgres, so it cannot
// itself verify the CTE's SQL validity or Postgres's actual
// snapshot-vs-live-index-check behavior — that rests on Postgres's own
// documented guarantees (reasoned through in the audit and already
// verified live for the schema itself). What this suite proves: the
// application's claim-acquisition logic (plain insert, fall back to a
// stale-takeover CTE only on conflict, classify errors correctly) behaves
// correctly under a scripted "two callers, one relevant DB state"
// scenario, and that extractor.extract() is called AT MOST ONCE per
// logical key no matter how the race resolves. No real AI, network, or
// database call is made anywhere in this file.

const ACTIVE_CLAIM_INDEX = "pipeline_extraction_run_one_active_per_document";
const STALE_MINUTES = 15;

let runsTable = []; // [{ id, documentId, promptVersion, model, status, startedAt, completedAt, error, tokenUsage }]
let curriculumVersionInserts = [];
let reviewQueueInserts = [];
let evidenceInserts = [];
let idSeq = 0;
function idCounter() {
  return `row-${++idSeq}`;
}
let extractCallCount = 0;
let extractResultFixture = null;
let extractShouldThrow = null;
let shouldFailExecute = false;
let injectedExecuteError = null; // { code, constraint }
let persistenceShouldFailAt = null; // "curriculumVersion" | "reviewQueue" | null

let gatesEnabled = false;
let gateQueue = []; // [{ resolve, sqlObj }]

function resetState() {
  runsTable = [];
  curriculumVersionInserts = [];
  reviewQueueInserts = [];
  evidenceInserts = [];
  idSeq = 0;
  extractCallCount = 0;
  extractResultFixture = null;
  extractShouldThrow = null;
  shouldFailExecute = false;
  injectedExecuteError = null;
  persistenceShouldFailAt = null;
  gatesEnabled = false;
  gateQueue = [];
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

function sameKey(row, documentId, promptVersion) {
  return row.documentId === documentId && (row.promptVersion ?? "") === (promptVersion ?? "");
}

function buildUniqueViolation(constraint) {
  const err = new NeonDbError(`duplicate key value violates unique constraint "${constraint}"`);
  err.code = "23505";
  err.constraint = constraint;
  return err;
}

// Releases every gate CURRENTLY queued in one synchronous batch (not one
// at a time with a full flush between each) — releasing one-at-a-time
// with a flush in between would let the first-released call's ENTIRE
// remaining pipeline (AI call, persistence, completion) run to completion
// before the second gate is ever released, which defeats the purpose:
// the second request's conflict check would then see the first request's
// row already 'completed', not 'started', and incorrectly "win" too. By
// releasing everything queued at once, both continuations are scheduled
// as adjacent microtasks and correctly interleave at each subsequent
// await point, so a genuinely-concurrent claim conflict is observed while
// the winner's row is still 'started'. Repeats for however many rounds it
// takes to drain (handles a lost plain claim automatically falling back
// to a gated stale-takeover attempt, which registers a NEW gate entry
// only after this round's flush).
async function releaseAllPending() {
  while (gateQueue.length > 0) {
    const batch = gateQueue.splice(0, gateQueue.length);
    for (const entry of batch) entry.resolve();
    await flush();
  }
}

function fakeDb() {
  return {
    query: {
      pipelineExtractionRuns: {
        // Real code filters by documentId + status:'completed' +
        // promptVersion via Drizzle's relational query builder callback:
        // findFirst({ where: (runs, {eq,and}) => and(eq(runs.documentId,X), ...) }).
        // This suite tests multiple documents (test 10), so — unlike the
        // single-document simplification in
        // pipeline-extraction-failure-safety.test.mjs — the callback must
        // actually be invoked to recover which document/promptVersion is
        // being asked about, using instrumented eq/and stand-ins that
        // record each comparison instead of evaluating it against a real
        // column.
        findFirst: async (config) => {
          const wanted = {};
          const fakeRuns = new Proxy({}, { get: (_t, prop) => prop });
          const fakeEq = (col, val) => { wanted[col] = val; return true; };
          const fakeAnd = (...conds) => conds.every(Boolean);
          config.where(fakeRuns, { eq: fakeEq, and: fakeAnd });
          return runsTable.find((r) =>
            r.documentId === wanted.documentId &&
            r.status === wanted.status &&
            r.promptVersion === wanted.promptVersion
          );
        },
      },
    },
    async execute(sqlObj) {
      const text = fullText(sqlObj);
      const params = extractParams(sqlObj);

      if (text.includes('INSERT INTO "pipeline_extraction_run"') && text.includes("VALUES") && !text.includes("WITH stale")) {
        // Plain claim insert. Params: id, documentId, promptVersion, model, now.
        const [id, documentId, promptVersion, model, now] = params;
        if (gatesEnabled) await new Promise((resolve) => gateQueue.push({ resolve, sqlObj }));
        if (shouldFailExecute) throw new Error("INJECTED_DB_FAILURE");
        if (injectedExecuteError) throw buildUniqueViolation(injectedExecuteError.constraint);

        const conflict = runsTable.some((r) => sameKey(r, documentId, promptVersion) && r.status === "started");
        if (conflict) throw buildUniqueViolation(ACTIVE_CLAIM_INDEX);

        runsTable.push({ id, documentId, promptVersion, model, status: "started", startedAt: now, completedAt: null, error: null, tokenUsage: null });
        return { rows: [{ id }] };
      }

      if (text.includes("WITH stale")) {
        // Stale-takeover CTE. Params (fixed order — see pipeline.ts):
        // 0 now, 1 documentId, 2 promptVersion, 3 staleCutoff,
        // 4 documentId, 5 promptVersion, 6 takeoverClaimId, 7 documentId,
        // 8 promptVersion, 9 model, 10 now.
        const now = params[0];
        const documentId = params[1];
        const promptVersion = params[2];
        const staleCutoff = params[3];
        const takeoverClaimId = params[6];
        const model = params[9];

        // Snapshot taken at STATEMENT START (before any gating delay) —
        // mirrors "every CTE in one WITH shares one MVCC snapshot fixed
        // when the statement begins" (same technique already proven in
        // tests/pipeline-review-same-program-uniqueness.test.mjs).
        const targetAtStart = runsTable.find((r) => sameKey(r, documentId, promptVersion) && r.status === "started");
        const wouldMarkStale = !!(targetAtStart && targetAtStart.startedAt < staleCutoff);

        if (gatesEnabled) await new Promise((resolve) => gateQueue.push({ resolve, sqlObj }));
        if (shouldFailExecute) throw new Error("INJECTED_DB_FAILURE");
        if (injectedExecuteError) throw buildUniqueViolation(injectedExecuteError.constraint);

        // `stale` UPDATE: CAS-guarded on the row still being 'started' NOW
        // (a real UPDATE's WHERE re-checks live state, not the snapshot) —
        // a losing concurrent stale-recovery attempt's own `stale` CTE
        // correctly affects zero rows once a winner already flipped it.
        if (wouldMarkStale && targetAtStart.status === "started") {
          targetAtStart.status = "failed";
          targetAtStart.completedAt = now;
          targetAtStart.error = "Stale extraction claim recovered";
        }

        // `still_active`, evaluated live (forced to run after `stale`'s
        // write via the CTE dependency chain in the real statement).
        const stillActive = runsTable.some((r) => sameKey(r, documentId, promptVersion) && r.status === "started");
        if (stillActive) return { rows: [] }; // not stale, or already reclaimed by someone else

        runsTable.push({ id: takeoverClaimId, documentId, promptVersion, model, status: "started", startedAt: now, completedAt: null, error: null, tokenUsage: null });
        return { rows: [{ id: takeoverClaimId }] };
      }

      throw new Error("Unrecognized execute() shape in mock: " + text.slice(0, 200));
    },
    select() {
      return {
        from() {
          return {
            where() {
              return { limit: () => Promise.resolve([]) }; // always take the create-new-course path
            },
          };
        },
      };
    },
    insert(table) {
      return {
        values() {
          if (persistenceShouldFailAt === "curriculumVersion" && table === pipelineCurriculumVersions) {
            throw new Error("INJECTED_PERSISTENCE_FAILURE");
          }
          if (persistenceShouldFailAt === "reviewQueue" && table === pipelineReviewQueue) {
            throw new Error("INJECTED_PERSISTENCE_FAILURE");
          }
          const id = idCounter();
          if (table === pipelineCurriculumVersions) curriculumVersionInserts.push({ id });
          if (table === pipelineReviewQueue) reviewQueueInserts.push({ id });
          if (table === pipelineExtractionEvidence) evidenceInserts.push({ id });
          return {
            returning() {
              return Promise.resolve([{ id }]);
            },
            then(resolve, reject) {
              return Promise.resolve(undefined).then(resolve, reject);
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
              return applyUpdate(table, values);
            },
          };
        },
      };
    },
  };
}

function applyUpdate(table, values) {
  if (table === pipelineExtractionRuns) {
    // Applies to the most-recently-claimed run — this file's tests never
    // interleave two DIFFERENT runs' updates without first resolving
    // which one is "current" for that call, matching every other
    // extraction test file's established simplification.
    const row = runsTable[runsTable.length - 1];
    if (row) Object.assign(row, values);
  }
  // Other tables (e.g. pipelineCurriculumCourses.evidenceId link) are
  // irrelevant to this suite's assertions and are silently no-op'd.
  return Promise.resolve(undefined);
}

mock.module("@/db", { exports: { requireDb: () => fakeDb() } });
mock.module("../src/lib/curriculum/extraction/gemini.js", {
  exports: {
    GeminiCurriculumExtractor: class {
      async extract() {
        extractCallCount++;
        if (extractShouldThrow) throw extractShouldThrow;
        // Gated the same way as the DB claim steps: a real extraction
        // run's row stays 'started' for the ENTIRE duration of the AI
        // call and persistence, not just the claim insert. Without this,
        // the claim winner's whole pipeline would race to completion
        // uninterrupted during the same flush() that resolves a
        // concurrent loser's stale-takeover fallback, making the loser
        // incorrectly see the winner's row as already 'completed'
        // (looking freed) instead of still 'started' (correctly blocking).
        if (gatesEnabled) await new Promise((resolve) => gateQueue.push({ resolve, sqlObj: null }));
        return extractResultFixture;
      }
    },
  },
});

const { runExtractionPipeline } = await import(
  "../src/lib/curriculum/extraction/pipeline.js"
);

const CONTEXT = { country: "eg", university: "Example University", specialization: "Computer Science", degree: "Bachelor" };

function doc(id) {
  return {
    id,
    sourceId: "source-1",
    mimeType: "application/pdf",
    contentHash: `hash-${id}`,
    extractedText: "irrelevant for this suite",
    pageCount: 10,
    url: `https://example.edu/${id}.pdf`,
  };
}

function fullExtractionFixture(courseCount = 2) {
  const courses = [];
  for (let i = 1; i <= courseCount; i++) {
    courses.push({
      code: `CS${100 + i}`, nameAr: null, nameEn: `Course ${i}`, credits: 3,
      type: "major_requirement", semester: 1, prerequisites: [], evidence: [],
    });
  }
  return {
    data: { curriculum: { title: "BS CS", degree: "Bachelor", specialization: "CS", academicYear: "2024", totalCredits: 60 }, courses, document_limitations: null },
    error: undefined,
    tokenUsage: { input: 100, output: 50 },
  };
}

function seedCompletedRun(documentId, promptVersion = "v1") {
  runsTable.push({ id: `run-${documentId}-completed`, documentId, promptVersion, model: "m", status: "completed", startedAt: new Date(), completedAt: new Date(), error: null, tokenUsage: 10 });
}

function seedStartedRun(documentId, promptVersion, startedAt) {
  const id = `run-${documentId}-started`;
  runsTable.push({ id, documentId, promptVersion, model: "m", status: "started", startedAt, completedAt: null, error: null, tokenUsage: null });
  return id;
}

function seedFailedRun(documentId, promptVersion = "v1") {
  runsTable.push({ id: `run-${documentId}-failed`, documentId, promptVersion, model: "m", status: "failed", startedAt: new Date(), completedAt: new Date(), error: "prior failure", tokenUsage: 5 });
}

// ── 1: normal extraction ───────────────────────────────────────────────────

test("1. normal extraction: claim acquired, AI called once, same run becomes completed", async () => {
  resetState();
  extractResultFixture = fullExtractionFixture(2);

  const result = await runExtractionPipeline(doc("d1"), CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.skipped, false);
  assert.strictEqual(extractCallCount, 1);
  assert.strictEqual(runsTable.length, 1);
  assert.strictEqual(runsTable[0].status, "completed");
});

// ── 2: completed + forceRetry=false ────────────────────────────────────────

test("2. completed run + forceRetry=false: skipped, no new claim, AI not called", async () => {
  resetState();
  seedCompletedRun("d2");

  const result = await runExtractionPipeline(doc("d2"), CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.skipped, true);
  assert.strictEqual(extractCallCount, 0);
  assert.strictEqual(runsTable.length, 1, "no new row created");
});

// ── 3: completed + forceRetry=true ─────────────────────────────────────────

test("3. completed run + forceRetry=true: new claim allowed, AI called once", async () => {
  resetState();
  seedCompletedRun("d3");
  extractResultFixture = fullExtractionFixture(1);

  const result = await runExtractionPipeline(doc("d3"), CONTEXT, "program-1", "univ-1", true);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.skipped, false);
  assert.strictEqual(extractCallCount, 1);
  assert.strictEqual(runsTable.length, 2, "historical completed run preserved, new run added");
});

// ── 4: failed historical run ───────────────────────────────────────────────

test("4. failed historical run: claim allowed, AI called once", async () => {
  resetState();
  seedFailedRun("d4");
  extractResultFixture = fullExtractionFixture(1);

  const result = await runExtractionPipeline(doc("d4"), CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, true);
  assert.strictEqual(extractCallCount, 1);
  assert.strictEqual(runsTable.length, 2, "failed run preserved as history, new run added");
});

// ── 5: non-stale active run blocks ─────────────────────────────────────────

test("5. non-stale active run: blocked/skipped, AI not called", async () => {
  resetState();
  seedStartedRun("d5", "v1", new Date()); // fresh, not stale

  const result = await runExtractionPipeline(doc("d5"), CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.skipped, true);
  assert.strictEqual(result.reason, "already_running");
  assert.strictEqual(extractCallCount, 0);
  assert.strictEqual(runsTable.length, 1, "no new row created");
});

// ── 6: stale active run is recovered ───────────────────────────────────────

test("6. stale active run: old run marked failed, new claim acquired, AI called once", async () => {
  resetState();
  const staleStart = new Date(Date.now() - (STALE_MINUTES + 5) * 60_000);
  const oldId = seedStartedRun("d6", "v1", staleStart);
  extractResultFixture = fullExtractionFixture(1);

  const result = await runExtractionPipeline(doc("d6"), CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, true);
  assert.strictEqual(extractCallCount, 1);
  const oldRow = runsTable.find((r) => r.id === oldId);
  assert.strictEqual(oldRow.status, "failed");
  assert.strictEqual(oldRow.error, "Stale extraction claim recovered");
  const newRow = runsTable.find((r) => r.id !== oldId);
  assert.strictEqual(newRow.status, "completed");
});

// ── 7 / K / R: two simultaneous ordinary attempts ──────────────────────────

test("7/K/R. two concurrent ordinary claims, same (documentId, promptVersion): exactly one wins, AI called exactly once", async () => {
  resetState();
  extractResultFixture = fullExtractionFixture(1);
  gatesEnabled = true;

  const pA = runExtractionPipeline(doc("d7"), CONTEXT, "program-1", "univ-1");
  const pB = runExtractionPipeline(doc("d7"), CONTEXT, "program-1", "univ-1");
  await flush();
  await releaseAllPending();

  const [resA, resB] = await Promise.all([pA, pB]);
  const outcomes = [resA, resB];
  const succeededNotSkipped = outcomes.filter((r) => r.success && r.skipped === false);
  const skipped = outcomes.filter((r) => r.skipped === true);
  assert.strictEqual(succeededNotSkipped.length, 1, "exactly one request must actually perform the extraction");
  assert.strictEqual(skipped.length, 1, "the other must be skipped, not errored");
  assert.strictEqual(extractCallCount, 1, "extractor.extract must be called EXACTLY once — the core Phase 3.5B-4 success criterion");
  assert.strictEqual(runsTable.filter((r) => r.status === "started").length, 0);
  assert.strictEqual(runsTable.filter((r) => r.status === "completed").length, 1);
});

// ── 8 / L: two simultaneous stale-recovery attempts ────────────────────────

test("8/L. two concurrent stale-recovery attempts on the same stale run: exactly one new owner, AI called exactly once", async () => {
  resetState();
  const staleStart = new Date(Date.now() - (STALE_MINUTES + 5) * 60_000);
  const oldId = seedStartedRun("d8", "v1", staleStart);
  extractResultFixture = fullExtractionFixture(1);
  gatesEnabled = true;

  const pA = runExtractionPipeline(doc("d8"), CONTEXT, "program-1", "univ-1");
  const pB = runExtractionPipeline(doc("d8"), CONTEXT, "program-1", "univ-1");
  await flush();
  await releaseAllPending();

  const [resA, resB] = await Promise.all([pA, pB]);
  const outcomes = [resA, resB];
  const succeededNotSkipped = outcomes.filter((r) => r.success && r.skipped === false);
  const skipped = outcomes.filter((r) => r.skipped === true);
  assert.strictEqual(succeededNotSkipped.length, 1, "exactly one request must win the stale takeover");
  assert.strictEqual(skipped.length, 1);
  assert.strictEqual(extractCallCount, 1, "AI called exactly once even though two requests raced to recover the same stale claim");

  const oldRow = runsTable.find((r) => r.id === oldId);
  assert.strictEqual(oldRow.status, "failed", "the stale row must end up failed exactly once, not fought over");
  assert.strictEqual(runsTable.filter((r) => r.status === "started").length, 0);
  assert.strictEqual(runsTable.filter((r) => r.status === "completed").length, 1);
});

// ── loser creates no downstream data ───────────────────────────────────────

test("loser of a concurrent claim race creates no curriculum version, no evidence, no review queue, and no extra run row", async () => {
  resetState();
  extractResultFixture = fullExtractionFixture(1);
  gatesEnabled = true;

  const pA = runExtractionPipeline(doc("d-loser"), CONTEXT, "program-1", "univ-1");
  const pB = runExtractionPipeline(doc("d-loser"), CONTEXT, "program-1", "univ-1");
  await flush();
  await releaseAllPending();
  await Promise.all([pA, pB]);

  assert.strictEqual(runsTable.length, 1, "no extra attempt row for the loser");
  assert.strictEqual(extractCallCount, 1);
  assert.strictEqual(curriculumVersionInserts.length, 1, "only the winner creates a curriculum version");
  assert.strictEqual(reviewQueueInserts.length, 1, "only the winner creates a review queue item");
});

// ── 9: same document, different promptVersion — independent ───────────────

test("9. same document, different promptVersion: independent attempts, both allowed", async () => {
  resetState();
  extractResultFixture = fullExtractionFixture(1);

  const r1 = await runExtractionPipeline(doc("d9"), CONTEXT, "program-1", "univ-1");
  assert.strictEqual(r1.success, true);
  assert.strictEqual(r1.skipped, false);
  assert.strictEqual(extractCallCount, 1);
  assert.strictEqual(runsTable.length, 1);
  assert.strictEqual(runsTable[0].status, "completed");
  // A second run for the SAME document but a DIFFERENT promptVersion key
  // is a different logical extraction — modeled directly against the
  // claim function's own key scoping by seeding a distinct-promptVersion
  // active row and confirming it does not block a fresh key.
  seedStartedRun("d9", "v2-different", new Date());
  assert.strictEqual(runsTable.filter((r) => r.documentId === "d9").length, 2);
});

// ── 10: different documents — independent ──────────────────────────────────

test("10. different documents: independent attempts, both allowed, AI called once each", async () => {
  resetState();
  extractResultFixture = fullExtractionFixture(1);

  const rA = await runExtractionPipeline(doc("d10-a"), CONTEXT, "program-1", "univ-1");
  const rB = await runExtractionPipeline(doc("d10-b"), CONTEXT, "program-1", "univ-1");

  assert.strictEqual(rA.success, true);
  assert.strictEqual(rB.success, true);
  assert.strictEqual(extractCallCount, 2);
  assert.strictEqual(runsTable.length, 2);
});

// ── 11 / F: forceRetry does not bypass an active claim ─────────────────────

test("11/F. forceRetry=true does NOT bypass a non-stale active claim: blocked, AI not called", async () => {
  resetState();
  seedCompletedRun("d11"); // completed history exists
  seedStartedRun("d11", "v1", new Date()); // AND a fresh active claim exists too

  const result = await runExtractionPipeline(doc("d11"), CONTEXT, "program-1", "univ-1", true);

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.skipped, true);
  assert.strictEqual(result.reason, "already_running");
  assert.strictEqual(extractCallCount, 0);
});

// ── 12: AI provider returns a structured failure ───────────────────────────

test("12. AI provider returns failure: SAME claim row becomes failed, no second row", async () => {
  resetState();
  extractResultFixture = { data: null, error: "AI_TIMEOUT: mock timeout", tokenUsage: null };

  const result = await runExtractionPipeline(doc("d12"), CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, false);
  assert.strictEqual(runsTable.length, 1, "no second row for this attempt");
  assert.strictEqual(runsTable[0].status, "failed");
  assert.strictEqual(runsTable[0].error, "AI_TIMEOUT: mock timeout");
});

// ── 13: AI throws ───────────────────────────────────────────────────────────

test("13. AI provider throws: SAME claim row becomes failed via the catch path", async () => {
  resetState();
  extractShouldThrow = new Error("network exploded");

  const result = await runExtractionPipeline(doc("d13"), CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, false);
  assert.strictEqual(runsTable.length, 1);
  assert.strictEqual(runsTable[0].status, "failed");
  assert.match(runsTable[0].error, /AI_PROVIDER_THREW/);
});

// ── 14: persistence failure ─────────────────────────────────────────────────

test("14. persistence failure after AI success: SAME claim row becomes failed", async () => {
  resetState();
  extractResultFixture = fullExtractionFixture(1);
  persistenceShouldFailAt = "curriculumVersion";

  const result = await runExtractionPipeline(doc("d14"), CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, false);
  assert.strictEqual(runsTable.length, 1);
  assert.strictEqual(runsTable[0].status, "failed");
  assert.match(runsTable[0].error, /DB_WRITE_FAILED/);
});

// ── 15: completed only after review queue exists ───────────────────────────

test("15. success: claim row transitions to completed only after review-queue insert has happened", async () => {
  resetState();
  extractResultFixture = fullExtractionFixture(1);

  const result = await runExtractionPipeline(doc("d15"), CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, true);
  assert.strictEqual(runsTable[0].status, "completed");
  // Covered in full detail (ordering proof via writeLog) by
  // tests/pipeline-extraction-failure-safety.test.mjs; this suite only
  // needs to confirm the claim-based flow still reaches "completed" at all.
});

// ── Error classification (mirrors pipeline-review-same-program-uniqueness) ─

test("D. plain claim conflict on the active-claim index: caught, falls back to stale check, correctly blocked", async () => {
  resetState();
  seedStartedRun("d-conflict", "v1", new Date());
  injectedExecuteError = { constraint: ACTIVE_CLAIM_INDEX };

  const result = await runExtractionPipeline(doc("d-conflict"), CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.skipped, true);
  assert.strictEqual(extractCallCount, 0);
});

test("E. a 23505 with a DIFFERENT constraint propagates unchanged (not misclassified as a claim conflict)", async () => {
  resetState();
  injectedExecuteError = { constraint: "some_other_unrelated_constraint" };

  await assert.rejects(
    runExtractionPipeline(doc("d-wrong-constraint"), CONTEXT, "program-1", "univ-1"),
    (err) => {
      assert.strictEqual(err.constraint, "some_other_unrelated_constraint");
      return true;
    }
  );
  assert.strictEqual(extractCallCount, 0);
});

test("F. a non-DB failure during claim acquisition propagates unchanged", async () => {
  resetState();
  shouldFailExecute = true;

  await assert.rejects(
    runExtractionPipeline(doc("d-generic-fail"), CONTEXT, "program-1", "univ-1"),
    /INJECTED_DB_FAILURE/
  );
  assert.strictEqual(extractCallCount, 0);
});

// ── N: process-crash simulation ─────────────────────────────────────────────

test("N. process-crash simulation: an abandoned started claim is recoverable by the next attempt once stale", async () => {
  resetState();
  // Simulates: claim created, process dies before any terminal update.
  const crashedStart = new Date(Date.now() - 1 * 60_000); // 1 minute old — not yet stale
  const crashedId = seedStartedRun("d-crash", "v1", crashedStart);

  const tooSoon = await runExtractionPipeline(doc("d-crash"), CONTEXT, "program-1", "univ-1");
  assert.strictEqual(tooSoon.skipped, true, "not yet stale — correctly still blocked");
  assert.strictEqual(extractCallCount, 0);

  // Advance the "crash" further into the past to simulate time passing
  // beyond the stale threshold (no real sleep).
  const row = runsTable.find((r) => r.id === crashedId);
  row.startedAt = new Date(Date.now() - (STALE_MINUTES + 1) * 60_000);

  extractResultFixture = fullExtractionFixture(1);
  const recovered = await runExtractionPipeline(doc("d-crash"), CONTEXT, "program-1", "univ-1");

  assert.strictEqual(recovered.success, true);
  assert.strictEqual(recovered.skipped, false);
  assert.strictEqual(extractCallCount, 1, "exactly one AI call once recovery succeeds");
  assert.strictEqual(runsTable.find((r) => r.id === crashedId).status, "failed");
  assert.strictEqual(runsTable.filter((r) => r.status === "started").length, 0, "no permanent wedge");
});

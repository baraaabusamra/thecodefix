import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";
import { readFileSync } from "node:fs";
import { NeonDbError } from "@neondatabase/serverless";
import {
  pipelineCollectionJobs,
  pipelineUniversities,
  pipelinePrograms,
} from "../src/db/schema.js";

// Phase 3.5B-7 (Controlled Live Pilot Stage 1 BLOCKED — no supported
// application path created pipeline_collection_job rows; claimNextJob()/
// processNextJob() had nothing to enqueue). This suite exercises the new
// producer boundary: enqueueCollectionJob(universityId, programId).
//
// Same insert-then-catch-conflict shape already proven for source dedup
// (Phase 3.5B-6B-1), document dedup (3.5B-6B-2), and extraction claims
// (3.5B-4): a plain INSERT first, and on a unique-index conflict
// (23505 on pipeline_collection_job_one_active_per_target), fall back to
// looking up the existing active row. This suite models that exact
// constraint in-memory — same HONESTY NOTE as every prior suite in this
// engagement: it cannot execute real Postgres, so it cannot itself verify
// the partial index's SQL validity, only the application's conflict-safe
// logic. No real DB, network, or AI call is made anywhere in this file.

function extractParamsRecursive(sqlObj, out = []) {
  if (!sqlObj || !sqlObj.queryChunks) return out;
  for (const c of sqlObj.queryChunks) {
    if (c && c.constructor && c.constructor.name === "SQL") {
      extractParamsRecursive(c, out);
    } else if (!(c && c.constructor && c.constructor.name === "StringChunk")) {
      out.push(c);
    }
  }
  return out;
}

function collectEqPairs(sqlObj, pairs = []) {
  if (!sqlObj || !sqlObj.queryChunks) return pairs;
  const chunks = sqlObj.queryChunks;
  for (const c of chunks) {
    if (c && c.constructor && c.constructor.name === "SQL") {
      collectEqPairs(c, pairs);
    }
  }
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const isColumnLike =
      c &&
      typeof c.name === "string" &&
      c.constructor.name !== "StringChunk" &&
      c.constructor.name !== "Param" &&
      c.constructor.name !== "SQL";
    if (isColumnLike) {
      for (let j = i + 1; j < chunks.length; j++) {
        const p = chunks[j];
        if (p && p.constructor.name === "Param") {
          pairs.push([c.name, p.value]);
          break;
        }
        if (p && p.constructor.name !== "StringChunk") break;
      }
    }
  }
  return pairs;
}

const ACTIVE_JOB_INDEX = "pipeline_collection_job_one_active_per_target";

function buildUniqueViolation(constraint) {
  const err = new NeonDbError(`duplicate key value violates unique constraint "${constraint}"`);
  err.code = "23505";
  err.constraint = constraint;
  return err;
}

let universitiesTable = [];
let programsTable = [];
let jobsTable = []; // [{ id, universityId, programId, status, retryCount, maxRetries }]

let gatesEnabled = false;
let gateQueue = [];
let injectedInsertError = null;

function resetState() {
  universitiesTable = [{ id: "univ-1" }, { id: "univ-2" }];
  programsTable = [
    { id: "prog-1", universityId: "univ-1" },
    { id: "prog-2", universityId: "univ-1" },
    { id: "prog-other-univ", universityId: "univ-2" },
  ];
  jobsTable = [];
  gatesEnabled = false;
  gateQueue = [];
  injectedInsertError = null;
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

function makeSimpleSelectChain(rows, colsSpec) {
  let condPairs = [];
  const chain = {
    where(cond) {
      condPairs = collectEqPairs(cond);
      return chain;
    },
    then(resolve, reject) {
      const result = rows
        .filter((row) => condPairs.every(([col, val]) => row[col] === val))
        .map((row) => {
          if (!colsSpec) return row;
          const projected = {};
          for (const key of Object.keys(colsSpec)) projected[key] = row[key];
          return projected;
        });
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return chain;
}

// The post-conflict fallback lookup in enqueue.ts issues
// and(eq(universityId, X), eq(programId, Y) | isNull(programId)) — isNull()
// never produces a trailing Param, so collectEqPairs simply won't find a
// "programId" pair when isNull() was used. That absence IS the signal.
function makeJobsSelectChain(rows, colsSpec) {
  let condPairs = [];
  const chain = {
    where(cond) {
      condPairs = collectEqPairs(cond);
      return chain;
    },
    then(resolve, reject) {
      const programPair = condPairs.find(([col]) => col === "programId");
      const result = rows
        .filter((row) => {
          const univPair = condPairs.find(([col]) => col === "universityId");
          if (univPair && row.universityId !== univPair[1]) return false;
          if (programPair) return row.programId === programPair[1];
          return row.programId === null; // isNull(programId) was used
        })
        .map((row) => {
          if (!colsSpec) return row;
          const projected = {};
          for (const key of Object.keys(colsSpec)) projected[key] = row[key];
          return projected;
        });
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return chain;
}

function fakeDb() {
  return {
    select(colsSpec) {
      return {
        from(table) {
          if (table === pipelineUniversities) return makeSimpleSelectChain(universitiesTable, colsSpec);
          if (table === pipelinePrograms) return makeSimpleSelectChain(programsTable, colsSpec);
          if (table === pipelineCollectionJobs) return makeJobsSelectChain(jobsTable, colsSpec);
          throw new Error("Unexpected select target in this suite's fixture");
        },
      };
    },
    async execute(sqlObj) {
      // Only one raw-SQL shape reaches this fake: the job INSERT in
      // enqueue.ts. Params, in order: [id, universityId, programId]
      if (injectedInsertError) {
        const err = injectedInsertError;
        injectedInsertError = null;
        throw err;
      }
      const params = extractParamsRecursive(sqlObj);
      const [id, universityId, programId] = params;

      if (gatesEnabled) {
        await new Promise((resolve) => gateQueue.push({ resolve }));
      }

      const conflict = jobsTable.some((row) => {
        if (row.universityId !== universityId) return false;
        if ((row.programId ?? null) !== (programId ?? null)) return false;
        const inFlight = ["pending", "searching", "downloading", "parsing", "extracting", "validating"].includes(row.status);
        const retryable = row.status === "failed" && row.retryCount < row.maxRetries;
        return inFlight || retryable;
      });
      if (conflict) {
        throw buildUniqueViolation(ACTIVE_JOB_INDEX);
      }

      const row = {
        id,
        universityId,
        programId: programId ?? null,
        status: "pending",
        retryCount: 0,
        maxRetries: 3,
      };
      jobsTable.push(row);
      return { rows: [{ id }] };
    },
  };
}

mock.module("@/db", { exports: { requireDb: () => fakeDb() } });

const { enqueueCollectionJob, isActiveJobStatus, EnqueueValidationError } =
  await import("../src/lib/curriculum/jobs/enqueue.js");

test.beforeEach(() => {
  resetState();
});

test("1. authorized enqueue with no existing job creates one new pending job", async () => {
  const result = await enqueueCollectionJob("univ-1", "prog-1");
  assert.strictEqual(result.created, true);
  assert.strictEqual(jobsTable.length, 1);
  assert.strictEqual(jobsTable[0].id, result.jobId);
  assert.strictEqual(jobsTable[0].status, "pending");
});

test("5. missing university is rejected before any write", async () => {
  await assert.rejects(
    enqueueCollectionJob("univ-missing", null),
    (err) => err instanceof EnqueueValidationError && /UNIVERSITY_NOT_FOUND/.test(err.message)
  );
  assert.strictEqual(jobsTable.length, 0);
});

test("6. missing program is rejected before any write", async () => {
  await assert.rejects(
    enqueueCollectionJob("univ-1", "prog-missing"),
    (err) => err instanceof EnqueueValidationError && /PROGRAM_NOT_FOUND/.test(err.message)
  );
  assert.strictEqual(jobsTable.length, 0);
});

test("7. program belonging to a different university is rejected (cross-owned enqueue blocked)", async () => {
  await assert.rejects(
    enqueueCollectionJob("univ-1", "prog-other-univ"),
    (err) => err instanceof EnqueueValidationError && /PROGRAM_UNIVERSITY_MISMATCH/.test(err.message)
  );
  assert.strictEqual(jobsTable.length, 0);
});

test("8. a completed historical job does not block a new enqueue for the same target", async () => {
  jobsTable.push({ id: "old-1", universityId: "univ-1", programId: "prog-1", status: "completed", retryCount: 0, maxRetries: 3 });
  const result = await enqueueCollectionJob("univ-1", "prog-1");
  assert.strictEqual(result.created, true);
  assert.strictEqual(jobsTable.length, 2);
});

test("9. a failed EXHAUSTED historical job (retryCount = maxRetries — the exact Cairo CS state) does not block a new enqueue", async () => {
  jobsTable.push({ id: "old-1", universityId: "univ-1", programId: "prog-1", status: "failed", retryCount: 3, maxRetries: 3 });
  const result = await enqueueCollectionJob("univ-1", "prog-1");
  assert.strictEqual(result.created, true);
  assert.strictEqual(jobsTable.length, 2, "the old exhausted row must be left completely untouched, a new row created alongside it");
  assert.strictEqual(jobsTable[0].retryCount, 3, "the historical row's retryCount must never be mutated by enqueue");
});

test("9b. a failed job that STILL has retries left is treated as active and blocks a duplicate (reused, not exhausted)", async () => {
  jobsTable.push({ id: "old-1", universityId: "univ-1", programId: "prog-1", status: "failed", retryCount: 1, maxRetries: 3 });
  const result = await enqueueCollectionJob("univ-1", "prog-1");
  assert.strictEqual(result.created, false);
  assert.strictEqual(result.jobId, "old-1");
  assert.strictEqual(jobsTable.length, 1, "no new row created while a retry-eligible failed job exists");
});

for (const status of ["pending", "searching", "downloading", "parsing", "extracting", "validating"]) {
  test(`10/11/12. an existing '${status}' job is reused, not duplicated`, async () => {
    jobsTable.push({ id: "existing-1", universityId: "univ-1", programId: "prog-1", status, retryCount: 0, maxRetries: 3 });
    const result = await enqueueCollectionJob("univ-1", "prog-1");
    assert.strictEqual(result.created, false);
    assert.strictEqual(result.jobId, "existing-1");
    assert.strictEqual(jobsTable.length, 1);
  });
}

test("13. concurrent same-target enqueue -> exactly one active job, both callers converge on the same id", async () => {
  gatesEnabled = true;
  const p1 = enqueueCollectionJob("univ-1", "prog-1");
  const p2 = enqueueCollectionJob("univ-1", "prog-1");

  await flush();
  await releaseAllPending();
  const [r1, r2] = await Promise.all([p1, p2]);

  assert.strictEqual(jobsTable.length, 1, "exactly one job row must exist after a genuine race");
  assert.strictEqual(r1.jobId, r2.jobId, "both callers must converge on the same job id");
  const createdCount = [r1.created, r2.created].filter(Boolean).length;
  assert.strictEqual(createdCount, 1, "exactly one caller creates the row, the other reuses it");
});

test("14. two different programs at the same university get independent active jobs", async () => {
  const r1 = await enqueueCollectionJob("univ-1", "prog-1");
  const r2 = await enqueueCollectionJob("univ-1", "prog-2");
  assert.strictEqual(r1.created, true);
  assert.strictEqual(r2.created, true);
  assert.notStrictEqual(r1.jobId, r2.jobId);
  assert.strictEqual(jobsTable.length, 2);
});

test("15a. nullable programId: two university-level (no program) enqueues for the same university dedup via COALESCE", async () => {
  const r1 = await enqueueCollectionJob("univ-1", null);
  const r2 = await enqueueCollectionJob("univ-1", null);
  assert.strictEqual(r1.jobId, r2.jobId);
  assert.strictEqual(jobsTable.length, 1);
});

test("15b. nullable programId: a university-level job and a program-specific job for the same university do not collide", async () => {
  const r1 = await enqueueCollectionJob("univ-1", null);
  const r2 = await enqueueCollectionJob("univ-1", "prog-1");
  assert.notStrictEqual(r1.jobId, r2.jobId);
  assert.strictEqual(jobsTable.length, 2);
});

test("16. an unrelated insert error propagates and is not misclassified as an active-job conflict", async () => {
  injectedInsertError = new Error("CONNECTION_LOST");
  await assert.rejects(enqueueCollectionJob("univ-1", "prog-1"), /CONNECTION_LOST/);
  assert.strictEqual(jobsTable.length, 0);
});

test("17. a 23505 on a DIFFERENT constraint is not misclassified as an active-job conflict", async () => {
  injectedInsertError = buildUniqueViolation("some_other_constraint");
  await assert.rejects(enqueueCollectionJob("univ-1", "prog-1"));
  assert.strictEqual(jobsTable.length, 0);
});

test("isActiveJobStatus: matches the DB index's active predicate exactly", () => {
  for (const s of ["pending", "searching", "downloading", "parsing", "extracting", "validating"]) {
    assert.strictEqual(isActiveJobStatus(s, 0, 3), true, `${s} must be active regardless of retryCount`);
  }
  assert.strictEqual(isActiveJobStatus("failed", 0, 3), true, "failed with retries left is active");
  assert.strictEqual(isActiveJobStatus("failed", 3, 3), false, "failed with retries exhausted is not active");
  assert.strictEqual(isActiveJobStatus("completed", 0, 3), false);
  assert.strictEqual(isActiveJobStatus("cancelled", 0, 3), false);
  assert.strictEqual(isActiveJobStatus("source_found", 0, 3), false, "defined in the enum but never produced/claimable today");
  assert.strictEqual(isActiveJobStatus("needs_review", 0, 3), false, "defined in the enum but never produced/claimable today");
});

test("18. enqueue.ts never imports discovery/collection/extraction modules (zero downstream side effects, structurally)", () => {
  const src = readFileSync(new URL("../src/lib/curriculum/jobs/enqueue.ts", import.meta.url), "utf8");
  const importLines = src.split("\n").filter((line) => /^\s*import\b/.test(line)).join("\n");
  assert.doesNotMatch(importLines, /tavily/i, "must never import the Tavily discovery provider");
  assert.doesNotMatch(importLines, /safeFetch|collection\/fetcher/, "must never import the collection fetcher");
  assert.doesNotMatch(importLines, /gemini|anthropic|extraction\//i, "must never import an AI extraction module");
  assert.doesNotMatch(importLines, /pipelineSources|pipelineDocuments|pipelineExtractionRuns|pipelineReviewQueue/, "must never import downstream pipeline tables");
});

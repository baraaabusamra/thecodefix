import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";
import {
  pipelineSources,
  pipelineDocuments,
  pipelineUniversities,
  pipelinePrograms,
} from "../src/db/schema.js";

// Phase 3.5B-6B-2 (P1-BLOCKER: duplicate document rows / duplicate paid
// extraction). Closes the gap identified by the Phase 3.5B-6A audit:
// processNextJob's collection step always inserted a new pipelineDocuments
// row, even when a document with identical bytes already existed for the
// SAME source — a global (unscoped) contentHash lookup only reused the
// storage blob, never the DB row. Two document rows with identical bytes
// have two different ids, and Phase 3.5B-4's active-extraction claim is
// scoped per documentId, not per content — so duplicate collection could
// independently reach paid Gemini extraction twice for the same bytes.
//
// The fix: a DB unique index, pipeline_document_source_content_hash_unique,
// on (sourceId, contentHash) (src/db/schema.ts), and a conflict-safe
// INSERT ... ON CONFLICT (sourceId, contentHash) DO NOTHING ... RETURNING
// in jobs/process.ts. This suite models that exact constraint in-memory: a
// fake pipelineDocuments insert enforces the same (sourceId, contentHash)
// uniqueness the real Postgres index enforces, so a "conflict" in this
// suite means the same thing a real unique-violation would mean.
//
// Global content-hash reuse for STORAGE (Blob path reuse only, never
// document identity) is preserved unchanged and is not what this suite is
// verifying — see the Phase 3.5B-6A audit for why that distinction matters
// (different sources may legitimately share identical bytes and must keep
// separate document rows for provenance).
//
// HONESTY NOTE (same caveat as every prior concurrency suite in this
// engagement): this suite cannot execute real Postgres, so it cannot
// itself verify the unique index's SQL validity or Postgres's actual
// concurrent-transaction behavior — that rests on Postgres's own
// documented guarantees (reasoned through in the audit and verified live
// against the real schema/index this phase, before this suite was
// written). What this suite proves: the application's conflict-safe
// insert-then-fallback-lookup logic behaves correctly under a scripted
// "two callers, one relevant DB state" scenario, modeling the same
// (sourceId, contentHash) uniqueness the real index enforces. No real AI,
// network, database, or Blob storage call is made anywhere in this file.

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

let universitiesTable = [];
let programsTable = [];
let sourcesTable = [];
let documentsTable = []; // [{ id, sourceId, contentHash, storagePath, ... }] — enforces (sourceId, contentHash) uniqueness like the real DB index
let idSeq = 0;

let claimQueue = []; // jobs to hand out, one per claimNextJob() call
let updateJobStatusCalls = []; // [{ jobId, status, error, metadata }]
let failNextUpdateJobStatus = null; // status string to fail on, once

let fetchResultForCall = null; // (callIndex) => FetchResult, or a fixed FetchResult
let fetchCallCount = 0;
let injectedInsertError = null; // Error to throw from the document insert, once

let gatesEnabled = false;
let gateQueue = [];

function resetState() {
  universitiesTable = [{ id: "univ-1", universitySlug: "test-u", officialDomain: "test.edu" }];
  programsTable = [];
  sourcesTable = [
    { id: "src-1", universityId: "univ-1", programId: null, url: "https://test.edu/plan" },
    { id: "src-2", universityId: "univ-1", programId: null, url: "https://test.edu/plan-alt" },
  ];
  documentsTable = [];
  idSeq = 0;
  claimQueue = [];
  updateJobStatusCalls = [];
  failNextUpdateJobStatus = null;
  fetchResultForCall = null;
  fetchCallCount = 0;
  injectedInsertError = null;
  gatesEnabled = false;
  gateQueue = [];
}

function makeJob(overrides) {
  return {
    id: overrides.id ?? `job-${++idSeq}`,
    universityId: "univ-1",
    programId: null,
    status: "downloading",
    metadata: JSON.stringify({ sourceId: overrides.sourceId ?? "src-1" }),
    retryCount: 0,
    maxRetries: 3,
    ...overrides,
  };
}

function fetchResultFixture(hash, extra = {}) {
  return {
    url: "https://test.edu/plan",
    status: 200,
    contentType: "text/html",
    contentLength: 1234,
    buffer: Buffer.from("x".repeat(200)),
    hash,
    ...extra,
  };
}

function flush() {
  return new Promise((resolve) => setImmediate(resolve));
}

// Releases every gate currently queued in one synchronous batch — see the
// identical rationale in tests/pipeline-extraction-claim.test.mjs: batching
// keeps both continuations interleaving at each subsequent await point
// instead of letting the first-released call run to completion before the
// second is ever released.
async function releaseAllPending() {
  while (gateQueue.length > 0) {
    const batch = gateQueue.splice(0, gateQueue.length);
    for (const entry of batch) entry.resolve();
    await flush();
  }
}

function makeSelectChain(rows, colsSpec) {
  let condPairs = [];
  let limitN = null;
  const chain = {
    where(cond) {
      condPairs = collectEqPairs(cond);
      return chain;
    },
    limit(n) {
      limitN = n;
      return chain;
    },
    then(resolve, reject) {
      let result = rows.filter((row) => condPairs.every(([col, val]) => row[col] === val));
      if (typeof limitN === "number") result = result.slice(0, limitN);
      if (colsSpec) {
        result = result.map((row) => {
          const projected = {};
          for (const key of Object.keys(colsSpec)) projected[key] = row[key];
          return projected;
        });
      }
      return Promise.resolve(result).then(resolve, reject);
    },
  };
  return chain;
}

function projectCols(row, colsSpec) {
  if (!colsSpec) return row;
  const projected = {};
  for (const key of Object.keys(colsSpec)) projected[key] = row[key];
  return projected;
}

function fakeDb() {
  return {
    select(colsSpec) {
      return {
        from(table) {
          if (table === pipelineUniversities) return makeSelectChain(universitiesTable, colsSpec);
          if (table === pipelinePrograms) return makeSelectChain(programsTable, colsSpec);
          if (table === pipelineSources) return makeSelectChain(sourcesTable, colsSpec);
          if (table === pipelineDocuments) return makeSelectChain(documentsTable, colsSpec);
          return makeSelectChain([], colsSpec);
        },
      };
    },
    insert(table) {
      if (table !== pipelineDocuments) {
        throw new Error("Unexpected insert target in this suite's fixture — only pipelineDocuments is modeled");
      }
      return {
        values(values) {
          return {
            onConflictDoNothing() {
              return {
                returning(colsSpec) {
                  return {
                    then(resolve, reject) {
                      if (injectedInsertError) {
                        const err = injectedInsertError;
                        injectedInsertError = null;
                        return Promise.reject(err).catch(reject);
                      }
                      // This is the exact invariant the real
                      // pipeline_document_source_content_hash_unique index
                      // enforces in Postgres.
                      const conflictExists = documentsTable.some(
                        (row) => row.sourceId === values.sourceId && row.contentHash === values.contentHash
                      );
                      let result;
                      if (conflictExists) {
                        result = [];
                      } else {
                        const row = { id: `doc-${++idSeq}`, ...values };
                        documentsTable.push(row);
                        result = [projectCols(row, colsSpec)];
                      }
                      return Promise.resolve(result).then(resolve, reject);
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

mock.module("@/db", { exports: { requireDb: () => fakeDb() } });

mock.module("../src/lib/curriculum/jobs/claim.js", {
  exports: {
    claimNextJob: async () => claimQueue.shift() ?? null,
    updateJobStatus: async (jobId, status, error = null, metadata = null) => {
      if (failNextUpdateJobStatus === status) {
        failNextUpdateJobStatus = null;
        throw new Error("INJECTED_UPDATE_JOB_STATUS_FAILURE");
      }
      updateJobStatusCalls.push({ jobId, status, error, metadata });
    },
  },
});

mock.module("../src/lib/curriculum/collection/fetcher.js", {
  exports: {
    safeFetch: async () => {
      const callIndex = fetchCallCount++;
      if (gatesEnabled) {
        await new Promise((resolve) => gateQueue.push({ resolve }));
      }
      if (typeof fetchResultForCall === "function") return fetchResultForCall(callIndex);
      return fetchResultForCall;
    },
  },
});

mock.module("../src/lib/curriculum/collection/pdf.js", {
  exports: {
    validatePdf: async () => ({ isValid: true, pageCount: 1, extractedText: "pdf text" }),
  },
});

mock.module("../src/lib/curriculum/collection/html.js", {
  exports: {
    extractHtmlText: () => ({ extractedText: "x".repeat(200) }),
  },
});

const storeDocumentCalls = [];
mock.module("../src/lib/curriculum/collection/storage.js", {
  exports: {
    storeDocument: async (_universityId, _programId, hash) => {
      storeDocumentCalls.push(hash);
      return `blob://${hash}`;
    },
  },
});

const { processNextJob } = await import("../src/lib/curriculum/jobs/process.js");

test.beforeEach(() => {
  resetState();
  storeDocumentCalls.length = 0;
});

test("1. same source + same bytes sequential -> one document row", async () => {
  fetchResultForCall = fetchResultFixture("hash-A");
  claimQueue.push(makeJob({ id: "job-1", sourceId: "src-1" }));
  claimQueue.push(makeJob({ id: "job-2", sourceId: "src-1" }));

  await processNextJob();
  await processNextJob();

  assert.strictEqual(documentsTable.length, 1);
  assert.strictEqual(documentsTable[0].sourceId, "src-1");
  assert.strictEqual(documentsTable[0].contentHash, "hash-A");

  const completed = updateJobStatusCalls.filter((c) => c.status === "completed");
  assert.strictEqual(completed.length, 2);
  assert.strictEqual(completed[0].metadata.documentId, completed[1].metadata.documentId, "both calls must resolve to the same document id");
});

test("2 & 3. concurrent identical collection for same source -> one row, both callers resolve to same document id", async () => {
  fetchResultForCall = fetchResultFixture("hash-B");
  gatesEnabled = true;
  claimQueue.push(makeJob({ id: "job-A", sourceId: "src-1" }));
  claimQueue.push(makeJob({ id: "job-B", sourceId: "src-1" }));

  const p1 = processNextJob();
  const p2 = processNextJob();

  // Let both callers reach the gated fetch() call before releasing either.
  await flush();
  await releaseAllPending();

  await Promise.all([p1, p2]);

  assert.strictEqual(documentsTable.length, 1, "exactly one document row must exist for (sourceId, hash)");
  const completed = updateJobStatusCalls.filter((c) => c.status === "completed");
  assert.strictEqual(completed.length, 2);
  assert.strictEqual(
    completed[0].metadata.documentId,
    completed[1].metadata.documentId,
    "both concurrent callers must converge on the same document id"
  );
});

test("4. same source + changed bytes -> two document rows (new snapshot allowed)", async () => {
  fetchResultForCall = (callIndex) => fetchResultFixture(callIndex === 0 ? "hash-v1" : "hash-v2");
  claimQueue.push(makeJob({ id: "job-1", sourceId: "src-1" }));
  claimQueue.push(makeJob({ id: "job-2", sourceId: "src-1" }));

  await processNextJob();
  await processNextJob();

  assert.strictEqual(documentsTable.length, 2);
  const hashes = documentsTable.map((d) => d.contentHash).sort();
  assert.deepStrictEqual(hashes, ["hash-v1", "hash-v2"]);
  assert.ok(documentsTable.every((d) => d.sourceId === "src-1"));
});

test("5 & 10. different sources + identical bytes -> two separate document rows, both valid", async () => {
  fetchResultForCall = fetchResultFixture("hash-shared");
  claimQueue.push(makeJob({ id: "job-1", sourceId: "src-1" }));
  claimQueue.push(makeJob({ id: "job-2", sourceId: "src-2" }));

  await processNextJob();
  await processNextJob();

  assert.strictEqual(documentsTable.length, 2, "cross-source identical content must NOT be merged into one row");
  const bySource = Object.fromEntries(documentsTable.map((d) => [d.sourceId, d]));
  assert.strictEqual(bySource["src-1"].contentHash, "hash-shared");
  assert.strictEqual(bySource["src-2"].contentHash, "hash-shared");
  assert.notStrictEqual(bySource["src-1"].id, bySource["src-2"].id);
});

test("6. same source + same hash does not create a second extraction identity", async () => {
  fetchResultForCall = fetchResultFixture("hash-C");
  claimQueue.push(makeJob({ id: "job-1", sourceId: "src-1" }));
  claimQueue.push(makeJob({ id: "job-2", sourceId: "src-1" }));

  await processNextJob();
  await processNextJob();

  // Extraction eligibility (batch.ts) is exactly "one status='completed'
  // pipelineDocuments row per document identity" — asserting there is only
  // one such row for this (sourceId, hash) directly proves duplicate
  // collection cannot create a second extraction candidate, without
  // needing to invoke real extraction.
  const eligible = documentsTable.filter(
    (d) => d.sourceId === "src-1" && d.contentHash === "hash-C" && d.status === "completed"
  );
  assert.strictEqual(eligible.length, 1);
});

test("7 & 18. storage succeeded but job-completion update fails, retry with same bytes -> one document row reused", async () => {
  fetchResultForCall = fetchResultFixture("hash-D");
  failNextUpdateJobStatus = "completed";
  claimQueue.push(makeJob({ id: "job-1", sourceId: "src-1" }));

  // The 'completed' status update throws; process.ts's own catch block
  // then calls updateJobStatus(..., 'failed', ...), which succeeds (the
  // injected failure only fires once) — so processNextJob() resolves
  // normally, exactly like real production behavior, it just records the
  // job as 'failed' instead of 'completed'.
  await processNextJob();

  const failed = updateJobStatusCalls.filter((c) => c.status === "failed");
  assert.strictEqual(failed.length, 1);
  assert.match(failed[0].error, /INJECTED_UPDATE_JOB_STATUS_FAILURE/);

  // The document insert happens BEFORE the job-status update, so it must
  // have persisted despite the subsequent status-update failure.
  assert.strictEqual(documentsTable.length, 1);

  // Retry: same source, same bytes (job reclaimed by stale recovery /
  // claim.ts after the failed status update left it stuck).
  claimQueue.push(makeJob({ id: "job-1-retry", sourceId: "src-1" }));
  await processNextJob();

  assert.strictEqual(documentsTable.length, 1, "retry with identical bytes must reuse the existing row, not duplicate it");
  const completed = updateJobStatusCalls.filter((c) => c.status === "completed");
  assert.strictEqual(completed.length, 1);
  assert.strictEqual(completed[0].metadata.documentId, documentsTable[0].id);
});

test("8 & 9. unexpected DB error propagates and fails the job; a conflict (no error) does not", async () => {
  fetchResultForCall = fetchResultFixture("hash-E");
  injectedInsertError = new Error("CONNECTION_LOST");
  claimQueue.push(makeJob({ id: "job-1", sourceId: "src-1" }));

  await processNextJob();

  assert.strictEqual(documentsTable.length, 0, "a real error must not leave a partial row");
  const failed = updateJobStatusCalls.filter((c) => c.status === "failed");
  assert.strictEqual(failed.length, 1);
  assert.match(failed[0].error, /CONNECTION_LOST/);

  // Now the same source/bytes with NO injected error: this must succeed
  // and, on a second run, hit a genuine conflict (not an error) and reuse
  // the row — contrast case for "conflict is duplicate/reuse, not failure".
  claimQueue.push(makeJob({ id: "job-2", sourceId: "src-1" }));
  claimQueue.push(makeJob({ id: "job-3", sourceId: "src-1" }));
  await processNextJob();
  await processNextJob();

  assert.strictEqual(documentsTable.length, 1);
  const completed = updateJobStatusCalls.filter((c) => c.status === "completed");
  assert.strictEqual(completed.length, 2, "the second (conflicting) run must still complete successfully, not fail");
});

test("11. SHA-256 content hashing remains deterministic (unchanged invariant this suite's dedup logic depends on)", async () => {
  const { createHash } = await import("node:crypto");
  const buffer = Buffer.from("identical curriculum bytes");
  const h1 = createHash("sha256").update(buffer).digest("hex");
  const h2 = createHash("sha256").update(buffer).digest("hex");
  assert.strictEqual(h1, h2);
  assert.strictEqual(h1.length, 64);
});

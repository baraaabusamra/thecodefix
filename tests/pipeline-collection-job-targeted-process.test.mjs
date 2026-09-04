import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";
import { readFileSync } from "node:fs";
import { NeonDbError } from "@neondatabase/serverless";
import {
  pipelineSources,
  pipelineDocuments,
  pipelineUniversities,
  pipelinePrograms,
} from "../src/db/schema.js";

// Phase 3.5B-7B: this suite proves processJobById()/processNextJob() share
// the identical processClaimedJob() core (jobs/process.ts) -- there is no
// second, independently-written discovery/collection implementation to
// drift out of sync -- and that processJobById() calls claimJobById(id)
// specifically, never claimNextJob(). claim.ts itself is mocked here
// (matching tests/pipeline-source-dedup.test.mjs's established convention
// for this file) since its real SQL-level correctness is already fully
// covered by tests/pipeline-collection-job-targeted-claim.test.mjs -- this
// suite is about process.ts's orchestration, not claim.ts's SQL.
//
// No real AI, network, or database call is made anywhere in this file.

let universitiesTable = [];
let programsTable = [];
let sourcesTable = [];
let documentsTable = [];
let idSeq = 0;

let claimNextJobCalls = [];
let claimJobByIdCalls = [];
let claimNextJobReturns = null;
let claimJobByIdReturns = null;
let updateJobStatusCalls = [];

let tavilySearchCalls = [];
let tavilyResultsFixture = [];
let fetchCallCount = 0;
let fetchResultForCall = null;

function resetState() {
  universitiesTable = [{ id: "univ-1", universitySlug: "test-u", officialDomain: "test.edu" }];
  programsTable = [{ id: "prog-1", universityId: "univ-1", specializationSlug: "computer-science", canonicalName: "Computer Science" }];
  sourcesTable = [];
  documentsTable = [];
  idSeq = 0;
  claimNextJobCalls = [];
  claimJobByIdCalls = [];
  claimNextJobReturns = null;
  claimJobByIdReturns = null;
  updateJobStatusCalls = [];
  tavilySearchCalls = [];
  tavilyResultsFixture = [{ url: "https://test.edu/study-plan.pdf", title: "Computer Science Study Plan" }];
  fetchCallCount = 0;
  fetchResultForCall = () => ({
    url: "https://test.edu/study-plan.pdf",
    status: 200,
    contentType: "text/html",
    contentLength: 1234,
    buffer: Buffer.from("x".repeat(200)),
    hash: "hash-A",
  });
}

function collectEqPairs(sqlObj, pairs = []) {
  if (!sqlObj || !sqlObj.queryChunks) return pairs;
  const chunks = sqlObj.queryChunks;
  for (const c of chunks) {
    if (c && c.constructor && c.constructor.name === "SQL") collectEqPairs(c, pairs);
  }
  for (let i = 0; i < chunks.length; i++) {
    const c = chunks[i];
    const isColumnLike =
      c && typeof c.name === "string" && c.constructor.name !== "StringChunk" &&
      c.constructor.name !== "Param" && c.constructor.name !== "SQL";
    if (isColumnLike) {
      for (let j = i + 1; j < chunks.length; j++) {
        const p = chunks[j];
        if (p && p.constructor.name === "Param") { pairs.push([c.name, p.value]); break; }
        if (p && p.constructor.name !== "StringChunk") break;
      }
    }
  }
  return pairs;
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
      if (table !== pipelineDocuments) throw new Error("Unexpected insert target");
      return {
        values(values) {
          return {
            onConflictDoNothing() {
              return {
                returning() {
                  return {
                    then(resolve, reject) {
                      const conflictExists = documentsTable.some(
                        (row) => row.sourceId === values.sourceId && row.contentHash === values.contentHash
                      );
                      let result;
                      if (conflictExists) {
                        result = [];
                      } else {
                        const row = { id: `doc-${++idSeq}`, ...values };
                        documentsTable.push(row);
                        result = [{ id: row.id }];
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
    async execute(sqlObj) {
      // Only the source-insert raw SQL from process.ts reaches this fake.
      const params = [];
      (function walk(o) {
        for (const c of o.queryChunks) {
          if (c?.constructor?.name === "SQL") walk(c);
          else if (c?.constructor?.name !== "StringChunk") params.push(c);
        }
      })(sqlObj);
      const [id, universityId, programId, url, normalizedUrl, domain, sourceType, title, credibilityScore] = params;

      const conflict = sourcesTable.some(
        (row) =>
          row.status === "active" &&
          row.universityId === universityId &&
          (row.programId ?? "") === (programId ?? "") &&
          row.normalizedUrl === normalizedUrl
      );
      if (conflict) {
        const err = new NeonDbError('duplicate key value violates unique constraint "pipeline_source_one_active_per_target"');
        err.code = "23505";
        err.constraint = "pipeline_source_one_active_per_target";
        throw err;
      }

      const row = { id, universityId, programId, url, normalizedUrl, domain, sourceType, title, status: "active", credibilityScore };
      sourcesTable.push(row);
      return { rows: [{ id }] };
    },
  };
}

mock.module("@/db", { exports: { requireDb: () => fakeDb() } });

mock.module("../src/lib/curriculum/jobs/claim.js", {
  exports: {
    claimNextJob: async () => {
      claimNextJobCalls.push(true);
      return claimNextJobReturns;
    },
    claimJobById: async (jobId) => {
      claimJobByIdCalls.push(jobId);
      return claimJobByIdReturns;
    },
    updateJobStatus: async (jobId, status, error = null, metadata) => {
      updateJobStatusCalls.push({ jobId, status, error, metadata });
    },
  },
});

class FakeTavilyProvider {
  async search(...args) {
    tavilySearchCalls.push(args);
    return tavilyResultsFixture;
  }
}
mock.module("../src/lib/curriculum/discovery/tavily.js", { exports: { TavilySearchProvider: FakeTavilyProvider } });

mock.module("../src/lib/curriculum/collection/fetcher.js", {
  exports: {
    safeFetch: async () => {
      fetchCallCount++;
      return typeof fetchResultForCall === "function" ? fetchResultForCall() : fetchResultForCall;
    },
  },
});
mock.module("../src/lib/curriculum/collection/pdf.js", {
  exports: { validatePdf: async () => ({ isValid: true, pageCount: 1, extractedText: "pdf text" }) },
});
mock.module("../src/lib/curriculum/collection/html.js", {
  exports: { extractHtmlText: () => ({ extractedText: "x".repeat(200) }) },
});
mock.module("../src/lib/curriculum/collection/storage.js", {
  exports: { storeDocument: async (_u, _p, hash) => `blob://${hash}` },
});

const { processNextJob, processJobById } = await import("../src/lib/curriculum/jobs/process.js");

function makeJob(overrides) {
  return {
    id: overrides.id ?? "job-1",
    universityId: "univ-1",
    programId: overrides.programId ?? "prog-1",
    status: overrides.status ?? "pending",
    metadata: overrides.metadata ?? null,
    retryCount: 0,
    maxRetries: 3,
    ...overrides,
  };
}

test.beforeEach(() => {
  resetState();
});

test("processJobById calls claimJobById(jobId) specifically -- never claimNextJob", async () => {
  claimJobByIdReturns = makeJob({ id: "hashemite-job" });
  const didWork = await processJobById("hashemite-job");
  assert.strictEqual(didWork, true);
  assert.deepStrictEqual(claimJobByIdCalls, ["hashemite-job"]);
  assert.strictEqual(claimNextJobCalls.length, 0, "processJobById must never fall back to the global claim");
});

test("processNextJob calls claimNextJob -- never claimJobById", async () => {
  claimNextJobReturns = makeJob({ id: "job-1" });
  const didWork = await processNextJob();
  assert.strictEqual(didWork, true);
  assert.strictEqual(claimNextJobCalls.length, 1);
  assert.strictEqual(claimJobByIdCalls.length, 0);
});

test("processJobById returns false, does no work, when claimJobById finds nothing claimable", async () => {
  claimJobByIdReturns = null;
  const didWork = await processJobById("some-id");
  assert.strictEqual(didWork, false);
  assert.strictEqual(tavilySearchCalls.length, 0, "no discovery must run if nothing was claimed");
  assert.strictEqual(updateJobStatusCalls.length, 0);
});

test("11. metadata behavior is identical between processJobById and processNextJob (both use the same processClaimedJob core)", async () => {
  claimJobByIdReturns = makeJob({ id: "job-via-id" });
  await processJobById("job-via-id");
  const viaIdDownloading = updateJobStatusCalls.find((c) => c.jobId === "job-via-id" && c.status === "downloading");
  assert.ok(viaIdDownloading, "processJobById must reach the downloading transition and record sourceId in metadata");
  assert.ok(viaIdDownloading.metadata.sourceId);

  resetState();
  claimNextJobReturns = makeJob({ id: "job-via-next" });
  await processNextJob();
  const viaNextDownloading = updateJobStatusCalls.find((c) => c.jobId === "job-via-next" && c.status === "downloading");
  assert.ok(viaNextDownloading);
  assert.ok(viaNextDownloading.metadata.sourceId, "processNextJob must record metadata.sourceId identically");
});

test("12. downstream discovery/collection runs exactly once per processJobById call", async () => {
  claimJobByIdReturns = makeJob({ id: "job-via-id" });
  await processJobById("job-via-id");
  assert.strictEqual(tavilySearchCalls.length, 1, "Tavily must be called exactly once");
  assert.strictEqual(fetchCallCount, 1, "collection fetch must be called exactly once");

  const completedCall = updateJobStatusCalls.find((c) => c.status === "completed");
  assert.ok(completedCall, "the job must reach completed exactly once");
});

test("processJobById and processNextJob converge on the same source for the same target (dedup still holds across entry points)", async () => {
  claimJobByIdReturns = makeJob({ id: "job-a" });
  await processJobById("job-a");
  assert.strictEqual(sourcesTable.filter((s) => s.status === "active").length, 1);

  claimNextJobReturns = makeJob({ id: "job-b" });
  await processNextJob();
  assert.strictEqual(
    sourcesTable.filter((s) => s.status === "active").length,
    1,
    "a second job for the same target processed via the global path must still converge on the one existing active source"
  );
});

test("18-equivalent. processJobById never reaches an AI/extraction module (structural, same technique as enqueue.ts's suite)", () => {
  const src = readFileSync(new URL("../src/lib/curriculum/jobs/process.ts", import.meta.url), "utf8");
  const importLines = src.split("\n").filter((line) => /^\s*import\b/.test(line)).join("\n");
  assert.doesNotMatch(importLines, /gemini|anthropic|extraction\//i, "process.ts must never import an AI extraction module");
});

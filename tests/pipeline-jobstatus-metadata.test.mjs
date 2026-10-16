import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";

// Phase 3.5B-6B-1 root-cause fix, isolated. jobs/claim.ts's updateJobStatus
// used to default `metadata` to `null`, and `null !== undefined`, so the
// SQL builder's `if (metadata !== undefined)` guard fired even when a
// caller omitted the argument entirely — every failure-path call in
// jobs/process.ts's catch block (`updateJobStatus(job.id, 'failed',
// message)`, 3 args) silently overwrote the job's previously-recorded
// metadata (including sourceId) with the JSON string "null". This is what
// caused every retry after a downloading-phase failure to re-run discovery
// from scratch and create a new, duplicate pipelineSources row — confirmed
// live during the Phase 3.5B-6B-1 audit: 100% of then-failed jobs had
// metadata literally equal to 'null'.
//
// This suite uses the REAL updateJobStatus from claim.ts (not mocked) —
// kept in its own file specifically so it doesn't need to coexist with
// tests/pipeline-source-dedup.test.mjs's mock of the same module (Node's
// test runner only allows one mock.module() registration per specifier per
// process). Only @/db is mocked here, with a minimal fake modeling a
// single pipeline_collection_job row's metadata column.
//
// No real AI, network, or database call is made anywhere in this file.

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

let jobRow;

function resetState() {
  jobRow = { id: "job-1", metadata: null, error: null, status: null };
}

function fakeDb() {
  return {
    async execute(sqlObj) {
      // claim.ts builds this SQL by conditionally appending fragments in a
      // fixed order: status (always), completedAt=NOW() (no param, status-
      // dependent), "error" = ${error} (iff error !== undefined), "metadata"
      // = ${JSON.stringify(metadata)} (iff metadata !== undefined), then
      // always WHERE "id" = ${jobId}. So the param list is always
      // [status, ...(error?), ...(metadataJson?), jobId] in that order.
      const params = extractParamsRecursive(sqlObj);
      const jobId = params[params.length - 1];
      assert.strictEqual(jobId, jobRow.id, "test only models a single job row");

      const [status] = params;
      jobRow.status = status;

      if (params.length === 4) {
        // [status, error, metadataJson, jobId]
        jobRow.error = params[1];
        jobRow.metadata = params[2];
      } else if (params.length === 3) {
        // [status, error, jobId] — metadata clause absent, PRESERVE existing.
        jobRow.error = params[1];
      }
      return { rows: [] };
    },
  };
}

mock.module("@tcf/db", { exports: { requireDb: () => fakeDb() } });

const { updateJobStatus } = await import("../modules/academic/src/pipeline/jobs/claim.js");

test.beforeEach(() => {
  resetState();
});

test("explicit metadata is set correctly", async () => {
  await updateJobStatus("job-1", "downloading", null, { sourceId: "src-1" });
  assert.strictEqual(jobRow.metadata, JSON.stringify({ sourceId: "src-1" }));
  assert.strictEqual(jobRow.status, "downloading");
});

test("a failure-path call that OMITS metadata (matches process.ts's real catch-block call shape) preserves existing metadata", async () => {
  await updateJobStatus("job-1", "downloading", null, { sourceId: "src-1" });
  assert.strictEqual(jobRow.metadata, JSON.stringify({ sourceId: "src-1" }));

  // Exactly matches jobs/process.ts's catch block: updateJobStatus(job.id, 'failed', message) — 3 args.
  await updateJobStatus("job-1", "failed", "TIMEOUT");

  assert.strictEqual(
    jobRow.metadata,
    JSON.stringify({ sourceId: "src-1" }),
    "metadata must survive a failure-path call that omits it — this is the exact regression that caused duplicate source rows on retry"
  );
  assert.strictEqual(jobRow.status, "failed");
  assert.strictEqual(jobRow.error, "TIMEOUT");
});

test("multiple sequential failures never erase metadata once it has been set", async () => {
  await updateJobStatus("job-1", "downloading", null, { sourceId: "src-1", documentHash: "h1" });
  await updateJobStatus("job-1", "failed", "ERROR_1");
  await updateJobStatus("job-1", "failed", "ERROR_2");
  await updateJobStatus("job-1", "failed", "ERROR_3");

  assert.strictEqual(jobRow.metadata, JSON.stringify({ sourceId: "src-1", documentHash: "h1" }));
});

test("an explicit metadata: null argument still clears it (distinguishing 'omitted' from 'explicitly cleared')", async () => {
  await updateJobStatus("job-1", "downloading", null, { sourceId: "src-1" });
  assert.strictEqual(jobRow.metadata, JSON.stringify({ sourceId: "src-1" }));

  await updateJobStatus("job-1", "failed", "ERROR", null);
  assert.strictEqual(
    jobRow.metadata,
    JSON.stringify(null),
    "an EXPLICIT null argument (unlike omission) must still mean 'clear it' — only omission means 'preserve'"
  );
});

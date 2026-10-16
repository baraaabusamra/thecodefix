import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";

// src/app/admin/pipeline/test/actions.ts calls resolveAdmin()/can() before
// touching the DB, Tavily, or the collection/extraction pipelines. Those
// collaborators are mocked here (via node:test's built-in module mocking)
// so this suite never hits a real database, network, or the paid Gemini
// extraction API — it only proves the authorization gate itself.

const dbCalls = [];
const tavilySearchCalls = [];
const processNextJobCalls = [];
const processJobByIdCalls = [];
const runExtractionForPendingDocumentsCalls = [];
const enqueueCollectionJobLibCalls = [];
const extractionGateChecks = [];
let extractionEnabledMock = true;

function resetCallLogs() {
  dbCalls.length = 0;
  tavilySearchCalls.length = 0;
  processNextJobCalls.length = 0;
  processJobByIdCalls.length = 0;
  runExtractionForPendingDocumentsCalls.length = 0;
  enqueueCollectionJobLibCalls.length = 0;
  extractionGateChecks.length = 0;
}

// Fake university row so discoverSources() (which destructures the first
// select().where() result) has something to work with once past the gate.
const FAKE_UNIVERSITY_ROW = { id: "univ-1", universitySlug: "test-uni", officialDomain: null };

// requireDb() returns a minimal chainable stub that just records that a
// query was started — proving/disproving that a DB call happened is all
// this suite needs, not real query results.
function fakeDb() {
  const chain = {
    select() { dbCalls.push("select"); return chain; },
    from() { return chain; },
    where() { return Promise.resolve([FAKE_UNIVERSITY_ROW]); },
  };
  return chain;
}

let resolveAdminMock = async () => ({ ok: false, mode: "rbac", reason: "signin" });

mock.module("@tcf/db", {
  exports: {
    requireDb: () => fakeDb(),
  },
});

mock.module("@tcf/identity/admin-access", {
  exports: {
    resolveAdmin: (...args) => resolveAdminMock(...args),
  },
});

mock.module("@tcf/core/flags", {
  exports: {
    assertCurriculumExtractionEnabled: () => {
      extractionGateChecks.push(true);
      if (!extractionEnabledMock) {
        throw new Error("استخراج المناهج بالذكاء الاصطناعي معطّل حاليًا");
      }
    },
  },
});

mock.module("@tcf/academic/pipeline/discovery/tavily", {
  exports: {
    TavilySearchProvider: class {
      async search(...args) {
        tavilySearchCalls.push(args);
        return [];
      }
    },
  },
});

mock.module("@tcf/academic/pipeline/jobs/process", {
  exports: {
    processNextJob: async () => {
      processNextJobCalls.push(true);
      return false;
    },
    processJobById: async (jobId) => {
      processJobByIdCalls.push(jobId);
      return false;
    },
  },
});

mock.module("@tcf/academic/pipeline/extraction/batch", {
  exports: {
    runExtractionForPendingDocuments: async (maxDocs) => {
      runExtractionForPendingDocumentsCalls.push(maxDocs);
      return { processed: 0, results: [] };
    },
  },
});

mock.module("@tcf/academic/pipeline/jobs/enqueue", {
  exports: {
    enqueueCollectionJob: async (universityId, programId) => {
      enqueueCollectionJobLibCalls.push({ universityId, programId });
      return { jobId: "job-fake", created: true };
    },
  },
});

const {
  fetchUniversities,
  fetchPrograms,
  discoverSources,
  runCollectionBatch,
  runExtractionBatch,
  enqueueCollectionJob,
  runCollectionJob,
} = await import("../modules/academic/src/actions/admin-pipeline.js");

const ACTIONS = [
  { name: "fetchUniversities", call: () => fetchUniversities() },
  { name: "fetchPrograms", call: () => fetchPrograms("univ-1") },
  { name: "discoverSources", call: () => discoverSources("univ-1", null) },
  { name: "runCollectionBatch", call: () => runCollectionBatch() },
  { name: "runExtractionBatch", call: () => runExtractionBatch() },
  { name: "enqueueCollectionJob", call: () => enqueueCollectionJob("univ-1", null) },
  { name: "runCollectionJob", call: () => runCollectionJob("job-1") },
];

async function assertForbidden(call) {
  await assert.rejects(call, /Forbidden/);
}

function assertNoSideEffects() {
  assert.strictEqual(dbCalls.length, 0, "requireDb() must not be reached");
  assert.strictEqual(tavilySearchCalls.length, 0, "Tavily search must not be reached");
  assert.strictEqual(processNextJobCalls.length, 0, "collection job processing must not be reached");
  assert.strictEqual(
    runExtractionForPendingDocumentsCalls.length,
    0,
    "extraction batch (paid Gemini/Anthropic path) must not be reached"
  );
  assert.strictEqual(
    enqueueCollectionJobLibCalls.length,
    0,
    "collection-job enqueue must not be reached"
  );
  assert.strictEqual(
    processJobByIdCalls.length,
    0,
    "targeted collection-job processing must not be reached"
  );
  assert.strictEqual(extractionGateChecks.length, 0, "feature state must not be checked before authorization");
}

test("unauthorized (no session) — every action rejects before any side effect", async () => {
  resolveAdminMock = async () => ({ ok: false, mode: "rbac", reason: "signin" });
  for (const { name, call } of ACTIONS) {
    resetCallLogs();
    await assertForbidden(call());
    assertNoSideEffects(name);
  }
});

test("unauthorized (wrong role) — every action rejects before any side effect", async () => {
  // "operations" is a real role that lacks settings:manage.
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "operations" });
  for (const { name, call } of ACTIONS) {
    resetCallLogs();
    await assertForbidden(call());
    assertNoSideEffects(name);
  }
});

test("runExtractionBatch specifically cannot reach the paid extraction path when unauthorized", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "writer" });
  resetCallLogs();
  await assertForbidden(runExtractionBatch());
  assert.strictEqual(runExtractionForPendingDocumentsCalls.length, 0);
});

test("authorized extraction is fail-closed before the paid batch when the feature is disabled", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });
  extractionEnabledMock = false;
  resetCallLogs();

  await assert.rejects(runExtractionBatch(), /معطّل حاليًا/);
  assert.strictEqual(extractionGateChecks.length, 1);
  assert.strictEqual(runExtractionForPendingDocumentsCalls.length, 0);
  assert.strictEqual(dbCalls.length, 0);
});

test("authorized (owner, settings:manage) — actions proceed past the gate unchanged", async () => {
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });
  extractionEnabledMock = true;

  resetCallLogs();
  await fetchUniversities();
  assert.strictEqual(dbCalls.length, 1);

  resetCallLogs();
  await fetchPrograms("univ-1");
  assert.strictEqual(dbCalls.length, 1);

  resetCallLogs();
  const ranked = await discoverSources("univ-1", null);
  assert.strictEqual(dbCalls.length, 1);
  assert.strictEqual(tavilySearchCalls.length, 1);
  assert.deepStrictEqual(ranked, []);

  resetCallLogs();
  const collectionResult = await runCollectionBatch();
  assert.strictEqual(processNextJobCalls.length, 1); // loop breaks on first "no work"
  assert.deepStrictEqual(collectionResult, { processed: 0 });

  resetCallLogs();
  const extractionResult = await runExtractionBatch();
  assert.strictEqual(extractionGateChecks.length, 1);
  assert.strictEqual(runExtractionForPendingDocumentsCalls.length, 1);
  assert.strictEqual(runExtractionForPendingDocumentsCalls[0], 3); // MAX_EXTRACTIONS_PER_CLICK
  assert.deepStrictEqual(extractionResult, { processed: 0, results: [] });

  resetCallLogs();
  const enqueueResult = await enqueueCollectionJob("univ-1", "prog-1");
  assert.strictEqual(enqueueCollectionJobLibCalls.length, 1);
  assert.deepStrictEqual(enqueueCollectionJobLibCalls[0], { universityId: "univ-1", programId: "prog-1" });
  assert.deepStrictEqual(enqueueResult, { jobId: "job-fake", created: true });

  resetCallLogs();
  const runResult = await runCollectionJob("hashemite-job-id");
  assert.deepStrictEqual(processJobByIdCalls, ["hashemite-job-id"]);
  assert.strictEqual(processNextJobCalls.length, 0, "runCollectionJob must never fall back to the global batch path");
  assert.deepStrictEqual(runResult, { processed: false });
});

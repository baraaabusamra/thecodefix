import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";
import {
  pipelineExtractionRuns,
  pipelineCurriculumVersions,
  pipelineCourses,
  pipelineCurriculumCourses,
  pipelineCoursePrerequisites,
  pipelineExtractionEvidence,
  pipelineReviewQueue,
} from "../packages/db/src/schema.js";

process.env.CURRICULUM_EXTRACTION_ENABLED = "true";

// Phase 3.5A fix to modules/academic/src/pipeline/extraction/pipeline.ts (F-01): the
// extraction run is now created in "started" (the column's existing
// default) and only promoted to "completed" after the review-queue row has
// been persisted. On any failure, the SAME run row is updated to "failed"
// (never a second row). This suite injects a failure at every meaningful
// point in the persistence sequence and proves:
//   - the run is never left "completed" on a partial failure
//   - exactly one run row exists per attempt (update, not insert-again)
//   - a subsequent call with forceRetry=false is NOT skipped as already done
//   - on full success, the review queue exists before "completed" is written
//
// Phase 3.5B-4: the run row is now created by an atomic claim
// db.execute(sql`INSERT ...`) BEFORE the AI call, not by db.insert() after
// it (see acquireExtractionClaim in pipeline.ts) — the mock's execute()
// below models that single (non-concurrent, non-conflicting) plain-claim
// shape; this file's own concurrency/staleness behavior is covered
// separately in tests/pipeline-extraction-claim.test.mjs.

const TABLE_NAMES = new Map([
  [pipelineExtractionRuns, "pipelineExtractionRuns"],
  [pipelineCurriculumVersions, "pipelineCurriculumVersions"],
  [pipelineCourses, "pipelineCourses"],
  [pipelineCurriculumCourses, "pipelineCurriculumCourses"],
  [pipelineCoursePrerequisites, "pipelineCoursePrerequisites"],
  [pipelineExtractionEvidence, "pipelineExtractionEvidence"],
  [pipelineReviewQueue, "pipelineReviewQueue"],
]);
function nameOf(table) {
  return TABLE_NAMES.get(table) ?? "unknown";
}

let idCounter = 0;
function nextId(prefix) {
  return `${prefix}-${++idCounter}`;
}

let runsTable = []; // in-memory pipelineExtractionRuns rows
const writeLog = []; // ordered { table, op, values }
let failTrigger = null; // (tableName, op, values) => boolean

function resetState() {
  idCounter = 0;
  runsTable = [];
  writeLog.length = 0;
  failTrigger = null;
}

function maybeFail(tableName, op, values) {
  if (failTrigger && failTrigger(tableName, op, values)) {
    throw new Error(`INJECTED_FAILURE:${op}:${tableName}`);
  }
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

function fakeDb() {
  return {
    query: {
      pipelineExtractionRuns: {
        findFirst: async () => {
          // Real code filters by documentId + status:'completed' + promptVersion;
          // this suite only ever runs one document/prompt-version at a time,
          // so filtering on status alone is an equivalent, simpler model.
          return runsTable.find((r) => r.status === "completed");
        },
      },
    },
    async execute(sqlObj) {
      const text = fullText(sqlObj);
      if (text.includes('INSERT INTO "pipeline_extraction_run"') && text.includes("VALUES")) {
        // The plain (non-conflicting) claim insert — see acquireExtractionClaim.
        // Params: id, documentId, promptVersion, model, startedAt.
        const [id, documentId, promptVersion, model, startedAt] = extractParams(sqlObj);
        maybeFail("pipelineExtractionRuns", "claim", { documentId, promptVersion, model });
        const row = { id, documentId, promptVersion, model, status: "started", startedAt, completedAt: null, tokenUsage: null, error: null };
        writeLog.push({ table: "pipelineExtractionRuns", op: "claim", values: row });
        runsTable.push(row);
        return { rows: [{ id }] };
      }
      throw new Error("Unrecognized execute() shape in mock: " + text.slice(0, 200));
    },
    select() {
      return {
        from() {
          return {
            where() {
              return {
                // pipelineCourses existing-course lookup — always "not
                // found" so every course takes the create-new-course path.
                limit: () => Promise.resolve([]),
              };
            },
          };
        },
      };
    },
    insert(table) {
      const tableName = nameOf(table);
      return {
        values(values) {
          maybeFail(tableName, "insert", values);
          const id = nextId(tableName);
          const row = { id, ...values };
          writeLog.push({ table: tableName, op: "insert", values: row });
          if (tableName === "pipelineExtractionRuns") runsTable.push(row);
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
      const tableName = nameOf(table);
      return {
        set(values) {
          return {
            where() {
              maybeFail(tableName, "update", values);
              writeLog.push({ table: tableName, op: "update", values });
              if (tableName === "pipelineExtractionRuns") {
                const row = runsTable[runsTable.length - 1];
                if (row) Object.assign(row, values);
              }
              return Promise.resolve(undefined);
            },
          };
        },
      };
    },
  };
}

let extractResultFixture = null;

mock.module("@tcf/db", { exports: { requireDb: () => fakeDb() } });
mock.module("../modules/academic/src/pipeline/extraction/gemini.js", {
  exports: {
    GeminiCurriculumExtractor: class {
      async extract() {
        return extractResultFixture;
      }
    },
  },
});

const { runExtractionPipeline } = await import(
  "../modules/academic/src/pipeline/extraction/pipeline.js"
);

const DOCUMENT = {
  id: "doc-1",
  sourceId: "source-1",
  mimeType: "application/pdf",
  contentHash: "hash-1",
  extractedText: "irrelevant for this test",
  pageCount: 10,
  url: "https://example.edu/curriculum.pdf",
};
const CONTEXT = { universityName: "Example University", programName: "Computer Science", degree: "Bachelor" };

function makeCourses(n) {
  const courses = [];
  for (let i = 1; i <= n; i++) {
    courses.push({
      code: `CS${100 + i}`,
      nameAr: null,
      nameEn: `Course ${i}`,
      credits: 3,
      type: "major_requirement",
      semester: 1,
      prerequisites: [],
      evidence: [{ page: i, quote: `Course ${i} evidence`, field: "code" }],
    });
  }
  return courses;
}

function fullExtractionFixture(courseCount = 20) {
  return {
    data: {
      curriculum: { title: "BS CS", degree: "Bachelor", specialization: "CS", academicYear: "2024", totalCredits: 60 },
      courses: makeCourses(courseCount),
      document_limitations: null,
    },
    error: undefined,
    tokenUsage: { input: 100, output: 50 },
  };
}

function runsOfStatus(status) {
  return runsTable.filter((r) => r.status === status);
}

async function assertRetryNotSkipped() {
  failTrigger = null; // clean retry attempt
  const retryResult = await runExtractionPipeline(DOCUMENT, CONTEXT, "program-1", "univ-1");
  assert.strictEqual(retryResult.success, true, "retry should succeed once the failure is no longer injected");
  assert.strictEqual(retryResult.skipped, false, "retry must NOT be silently skipped as already completed");
}

// ── 1: failure before curriculum-version insert ───────────────────────────

test("failure before curriculum-version insert: run ends failed, retry not skipped", async () => {
  resetState();
  extractResultFixture = fullExtractionFixture(3);
  failTrigger = (t, op) => t === "pipelineCurriculumVersions" && op === "insert";

  const result = await runExtractionPipeline(DOCUMENT, CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, false);
  assert.strictEqual(runsTable.length, 1, "exactly one run row for this attempt");
  assert.strictEqual(runsTable[0].status, "failed");
  assert.strictEqual(runsOfStatus("completed").length, 0);
  assert.strictEqual(
    writeLog.some((w) => w.table === "pipelineReviewQueue"),
    false,
    "review queue must never be reached"
  );

  await assertRetryNotSkipped();
  assert.strictEqual(runsTable.length, 2, "retry creates its own new attempt row, not a mutation of the failed one");
});

// ── 2: failure after curriculum-version insert (first course write) ──────

test("failure after curriculum-version insert: run ends failed, retry not skipped", async () => {
  resetState();
  extractResultFixture = fullExtractionFixture(3);
  failTrigger = (t, op) => t === "pipelineCourses" && op === "insert";

  const result = await runExtractionPipeline(DOCUMENT, CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, false);
  assert.strictEqual(runsTable.length, 1);
  assert.strictEqual(runsTable[0].status, "failed");
  assert.strictEqual(
    writeLog.some((w) => w.table === "pipelineCurriculumVersions" && w.op === "insert"),
    true,
    "the version row itself should have been persisted before the failure"
  );
  assert.strictEqual(writeLog.some((w) => w.table === "pipelineReviewQueue"), false);

  await assertRetryNotSkipped();
});

// ── 3: failure mid-course-loop (course 7 of 20) ───────────────────────────

test("failure mid-course-loop (course 7/20): run ends failed, no completed row, retry not skipped", async () => {
  resetState();
  extractResultFixture = fullExtractionFixture(20);
  let curriculumCourseInserts = 0;
  failTrigger = (t, op) => {
    if (t === "pipelineCurriculumCourses" && op === "insert") {
      curriculumCourseInserts++;
      return curriculumCourseInserts === 7;
    }
    return false;
  };

  const result = await runExtractionPipeline(DOCUMENT, CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, false);
  assert.strictEqual(runsTable.length, 1);
  assert.strictEqual(runsTable[0].status, "failed");
  assert.strictEqual(runsOfStatus("completed").length, 0, "no completed row remains for this attempt");
  const persistedCourseInserts = writeLog.filter(
    (w) => w.table === "pipelineCurriculumCourses" && w.op === "insert"
  );
  assert.strictEqual(persistedCourseInserts.length, 6, "6 courses should have persisted before course 7 failed");
  assert.strictEqual(writeLog.some((w) => w.table === "pipelineReviewQueue"), false);

  await assertRetryNotSkipped();
});

// ── 4: failure after evidence insert, before evidenceId update ───────────

test("failure between evidence insert and evidenceId link: run ends failed, retry not skipped", async () => {
  resetState();
  extractResultFixture = fullExtractionFixture(3);
  failTrigger = (t, op) => t === "pipelineCurriculumCourses" && op === "update";

  const result = await runExtractionPipeline(DOCUMENT, CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, false);
  assert.strictEqual(runsTable.length, 1);
  assert.strictEqual(runsTable[0].status, "failed");
  assert.strictEqual(
    writeLog.some((w) => w.table === "pipelineExtractionEvidence" && w.op === "insert"),
    true,
    "evidence row should have been persisted before the evidenceId link failed"
  );
  assert.strictEqual(writeLog.some((w) => w.table === "pipelineReviewQueue"), false);

  await assertRetryNotSkipped();
});

// ── 5: failure before review-queue creation (all courses done) ───────────

test("failure before review-queue insert: all courses persisted, run ends failed, retry not skipped", async () => {
  resetState();
  extractResultFixture = fullExtractionFixture(20);
  failTrigger = (t, op) => t === "pipelineReviewQueue" && op === "insert";

  const result = await runExtractionPipeline(DOCUMENT, CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, false);
  assert.strictEqual(runsTable.length, 1);
  assert.strictEqual(runsTable[0].status, "failed");
  assert.strictEqual(runsOfStatus("completed").length, 0);
  const persistedCourseInserts = writeLog.filter(
    (w) => w.table === "pipelineCurriculumCourses" && w.op === "insert"
  );
  assert.strictEqual(persistedCourseInserts.length, 20, "all 20 courses persisted before the review-queue insert failed");
  assert.strictEqual(writeLog.some((w) => w.table === "pipelineReviewQueue"), false);

  await assertRetryNotSkipped();
});

// ── 6: full success ────────────────────────────────────────────────────────

test("full successful extraction: exactly one run row, review queue precedes completed status", async () => {
  resetState();
  extractResultFixture = fullExtractionFixture(5);

  const result = await runExtractionPipeline(DOCUMENT, CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.skipped, false);
  assert.strictEqual(runsTable.length, 1, "exactly one extraction-run row for the attempt");
  assert.strictEqual(runsTable[0].status, "completed");

  const reviewQueueIndex = writeLog.findIndex((w) => w.table === "pipelineReviewQueue" && w.op === "insert");
  const completedUpdateIndex = writeLog.findIndex(
    (w) => w.table === "pipelineExtractionRuns" && w.op === "update" && w.values.status === "completed"
  );
  assert.notStrictEqual(reviewQueueIndex, -1, "review queue insert must have happened");
  assert.notStrictEqual(completedUpdateIndex, -1, "completed status update must have happened");
  assert.ok(
    reviewQueueIndex < completedUpdateIndex,
    "review queue must exist before the run is marked completed"
  );

  // A second call (default forceRetry=false) must now correctly skip.
  const secondCall = await runExtractionPipeline(DOCUMENT, CONTEXT, "program-1", "univ-1");
  assert.strictEqual(secondCall.skipped, true);
  assert.strictEqual(runsTable.length, 1, "no new row should be created for a correctly-skipped duplicate call");
});

// ── 7: AI/extractor failure before persistence ────────────────────────────

test("AI extractor failure before persistence: existing failure semantics preserved", async () => {
  resetState();
  extractResultFixture = { data: null, error: "AI_TIMEOUT: mock timeout", tokenUsage: null };

  const result = await runExtractionPipeline(DOCUMENT, CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, false);
  assert.strictEqual(runsTable.length, 1);
  assert.strictEqual(runsTable[0].status, "failed");
  // 2 writes now: the pre-AI-call claim (Phase 3.5B-4) and the failed
  // update — no persistence of any kind is attempted after an AI failure.
  assert.strictEqual(writeLog.length, 2);
  assert.strictEqual(writeLog[0].table, "pipelineExtractionRuns");
  assert.strictEqual(writeLog[0].op, "claim");
  assert.strictEqual(writeLog[1].op, "update");
  assert.strictEqual(writeLog[1].values.status, "failed");
});

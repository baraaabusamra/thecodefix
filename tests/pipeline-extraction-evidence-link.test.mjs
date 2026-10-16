import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";

process.env.CURRICULUM_EXTRACTION_ENABLED = "true";
import {
  pipelineExtractionEvidence,
  pipelineCurriculumCourses,
} from "../packages/db/src/schema.js";

// Phase 3 fix to src/lib/curriculum/extraction/pipeline.ts: link each
// curriculum course to the evidence extracted for it. This is only added
// because the relationship is structurally provable — the AI's structured
// output nests `evidence` inside each course object (see
// ExtractedCourseSchema in ./schema.ts), so every evidence entry processed
// while handling a given course genuinely belongs to that course. This test
// proves the link is real (points at evidence actually inserted for THAT
// course, not another one) and that courses with no evidence stay unlinked.

let idCounter = 0;
function nextId(prefix) {
  return `${prefix}-${++idCounter}`;
}

const evidenceInserts = []; // { id, values }
const courseInserts = []; // { id, values }
const courseUpdates = []; // { values }

function resetState() {
  idCounter = 0;
  evidenceInserts.length = 0;
  courseInserts.length = 0;
  courseUpdates.length = 0;
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
        // Force the full (non-idempotent-skip) persistence path.
        findFirst: async () => undefined,
      },
    },
    async execute(sqlObj) {
      // Phase 3.5B-4's pre-AI-call claim insert (see acquireExtractionClaim
      // in pipeline.ts) — this suite only ever runs one attempt per test,
      // so the plain (non-conflicting) claim always succeeds.
      const text = fullText(sqlObj);
      if (text.includes('INSERT INTO "pipeline_extraction_run"') && text.includes("VALUES")) {
        const [id] = extractParams(sqlObj);
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
                // found" so the pipeline takes the create-new-course branch.
                limit: () => Promise.resolve([]),
              };
            },
          };
        },
      };
    },
    insert(table) {
      return {
        values(values) {
          const id = nextId("row");
          const record = { id, values };
          return {
            returning() {
              if (table === pipelineExtractionEvidence) evidenceInserts.push(record);
              if (table === pipelineCurriculumCourses) courseInserts.push(record);
              return Promise.resolve([{ id }]);
            },
            // Inserts with no .returning() call (prerequisites, review queue,
            // extraction run's own bookkeeping paths not exercised here) are
            // still awaitable directly.
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
              if (table === pipelineCurriculumCourses) courseUpdates.push({ values });
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

test("a course with evidence gets evidenceId linked to the FIRST evidence row inserted for THAT course", async () => {
  resetState();
  extractResultFixture = {
    data: {
      curriculum: { title: "BS CS", degree: "Bachelor", specialization: "CS", academicYear: "2024", totalCredits: 130 },
      courses: [
        {
          code: "CS101",
          nameAr: null,
          nameEn: "Intro to CS",
          credits: 3,
          type: "major_requirement",
          semester: 1,
          prerequisites: [],
          evidence: [
            { page: 5, quote: "CS101, 3 credits", field: "credits" },
            { page: 5, quote: "CS101 Introduction", field: "code" },
          ],
        },
      ],
      document_limitations: null,
    },
    error: undefined,
    tokenUsage: { input: 100, output: 50 },
  };

  const result = await runExtractionPipeline(DOCUMENT, CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, true);
  assert.strictEqual(evidenceInserts.length, 2, "both evidence entries for the course must be persisted");
  assert.strictEqual(courseUpdates.length, 1, "exactly one evidenceId-linking update, for the one course");
  assert.strictEqual(
    courseUpdates[0].values.evidenceId,
    evidenceInserts[0].id,
    "evidenceId must point at the first evidence row actually inserted for this course"
  );
});

test("a course with NO evidence is never linked (evidenceId update is skipped entirely)", async () => {
  resetState();
  extractResultFixture = {
    data: {
      curriculum: { title: "BS CS", degree: "Bachelor", specialization: "CS", academicYear: "2024", totalCredits: 130 },
      courses: [
        {
          code: "CS999",
          nameAr: null,
          nameEn: "Undocumented Elective",
          credits: null,
          type: "unknown",
          semester: null,
          prerequisites: [],
          evidence: [],
        },
      ],
      document_limitations: null,
    },
    error: undefined,
    tokenUsage: { input: 50, output: 20 },
  };

  const result = await runExtractionPipeline(DOCUMENT, CONTEXT, "program-1", "univ-1");

  assert.strictEqual(result.success, true);
  assert.strictEqual(evidenceInserts.length, 0);
  assert.strictEqual(courseUpdates.length, 0, "no evidenceId update should be attempted for an evidence-less course");
});

test("two courses each link to their OWN evidence, never to the other course's", async () => {
  resetState();
  extractResultFixture = {
    data: {
      curriculum: { title: "BS CS", degree: "Bachelor", specialization: "CS", academicYear: "2024", totalCredits: 130 },
      courses: [
        {
          code: "CS101", nameAr: null, nameEn: "Intro to CS", credits: 3, type: "major_requirement", semester: 1,
          prerequisites: [],
          evidence: [{ page: 1, quote: "CS101 evidence", field: "code" }],
        },
        {
          code: "CS102", nameAr: null, nameEn: "Data Structures", credits: 3, type: "major_requirement", semester: 2,
          prerequisites: [],
          evidence: [{ page: 2, quote: "CS102 evidence", field: "code" }],
        },
      ],
      document_limitations: null,
    },
    error: undefined,
    tokenUsage: { input: 100, output: 50 },
  };

  await runExtractionPipeline(DOCUMENT, CONTEXT, "program-1", "univ-1");

  assert.strictEqual(evidenceInserts.length, 2);
  assert.strictEqual(courseUpdates.length, 2);
  // Update N must reference evidence row N (inserted while processing that
  // same course), never the other course's evidence row.
  assert.strictEqual(courseUpdates[0].values.evidenceId, evidenceInserts[0].id);
  assert.strictEqual(courseUpdates[1].values.evidenceId, evidenceInserts[1].id);
  assert.notStrictEqual(courseUpdates[0].values.evidenceId, evidenceInserts[1].id);
});

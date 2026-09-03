import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";
import {
  pipelineCurriculumVersions,
  pipelineCurriculumCourses,
  pipelineCoursePrerequisites,
  academicStudyPlans,
} from "../src/db/schema.js";

// Phase 3 additions to src/lib/curriculum/extraction/compiler.ts:
// (a) a governance floor — block publish only when a course has BOTH
//     evidenceId=null AND confidence=null (LOW confidence, if explicit, is
//     NOT blocked — docs/factual-data-governance.md §6 treats it as a valid
//     disclosure, not a violation);
// (b) capturing the previous academicStudyPlans values when an existing row
//     is overwritten, returned to the caller for audit purposes.
//
// Phase 3.5B-2 renamed compileAndPublishCurriculum to
// prepareCurriculumPublish and changed its contract: it no longer executes
// the academicStudyPlans write itself — it returns a prepared (not yet
// run) onConflictDoUpdate query object (`result.upsert`) for the caller to
// submit atomically alongside the audit log via db.batch(). This file was
// updated accordingly: assertions that used to check "did db.insert/update
// on academicStudyPlans get called" now check "was the upsert query
// prepared" (result.upsert defined) for the allowed paths, and "was
// db.insert(academicStudyPlans) never even reached" for the blocked paths
// — the governance semantics being tested are otherwise unchanged.

const insertCalls = []; // { table, values } — every db.insert(...).values(...) call

function resetState() {
  insertCalls.length = 0;
}

function makeChain(getResult) {
  const chain = {
    innerJoin() { return chain; },
    where() { return chain; },
    orderBy() { return chain; },
    limit() { return chain; },
    then(resolve, reject) { return Promise.resolve(getResult()).then(resolve, reject); },
  };
  return chain;
}

let versionInfoFixture = null; // { version, program, university }
let curriculumCoursesFixture = []; // [{ currCourse, baseCourse }]
let existingPlanFixture = null; // academicStudyPlans row or null

function fakeDb() {
  return {
    select() {
      return {
        from(table) {
          if (table === pipelineCurriculumVersions) {
            return makeChain(() => (versionInfoFixture ? [versionInfoFixture] : []));
          }
          if (table === pipelineCurriculumCourses) {
            return makeChain(() => curriculumCoursesFixture);
          }
          if (table === pipelineCoursePrerequisites) {
            return makeChain(() => []);
          }
          if (table === academicStudyPlans) {
            return makeChain(() => (existingPlanFixture ? [existingPlanFixture] : []));
          }
          return makeChain(() => []);
        },
      };
    },
    insert(table) {
      return {
        values(values) {
          insertCalls.push({ table, values });
          return {
            // prepareCurriculumPublish never awaits this chain itself — it
            // returns the prepared (unexecuted) query. Model that shape
            // directly rather than resolving a Promise.
            onConflictDoUpdate(config) {
              return { __prepared: "upsert", table, values, config };
            },
          };
        },
      };
    },
  };
}

mock.module("@/db", { exports: { requireDb: () => fakeDb() } });

const { prepareCurriculumPublish } = await import(
  "../src/lib/curriculum/extraction/compiler.js"
);

const BASE_VERSION_INFO = {
  version: { id: "version-1", status: "approved", programId: "program-1" },
  program: { id: "program-1", specializationSlug: "computer-science", canonicalName: null },
  university: { id: "univ-1", countrySlug: "jordan", universitySlug: "ju" },
};

function courseFixture(overrides) {
  return {
    currCourse: {
      id: "course-1",
      curriculumVersionId: "version-1",
      officialCourseCode: "CS101",
      officialCourseName: "Intro to CS",
      credits: 3,
      theoreticalCredits: null,
      practicalCredits: null,
      semester: 1,
      category: null,
      courseType: "major_requirement",
      position: 1,
      evidenceId: null,
      confidence: null,
      ...overrides,
    },
    baseCourse: { id: "base-1", normalizedName: "Intro to CS" },
  };
}

// ── allowed combinations (never blocked for having LOW confidence) ────────

const allowedCases = [
  { name: "evidenceId present + confidence HIGH", evidenceId: "ev-1", confidence: "HIGH" },
  { name: "evidenceId present + confidence null", evidenceId: "ev-1", confidence: null },
  { name: "evidenceId null + confidence LOW (must remain publishable)", evidenceId: null, confidence: "LOW" },
  { name: "evidenceId null + confidence MEDIUM", evidenceId: null, confidence: "MEDIUM" },
  { name: "evidenceId null + confidence HIGH", evidenceId: null, confidence: "HIGH" },
];

for (const c of allowedCases) {
  test(`prepareCurriculumPublish: publish allowed — ${c.name}`, async () => {
    resetState();
    versionInfoFixture = { ...BASE_VERSION_INFO };
    curriculumCoursesFixture = [courseFixture({ evidenceId: c.evidenceId, confidence: c.confidence })];
    existingPlanFixture = null;

    const result = await prepareCurriculumPublish("version-1");

    assert.strictEqual(result.country, "jordan");
    assert.strictEqual(result.university, "ju");
    assert.strictEqual(result.specialization, "computer-science");
    assert.ok(result.upsert, "an academicStudyPlans upsert query must have been prepared");
  });
}

// ── the one forbidden state — blocked before any academicStudyPlans write ─

test("prepareCurriculumPublish: evidenceId null AND confidence null → publication BLOCKED before any academicStudyPlans write", async () => {
  resetState();
  versionInfoFixture = { ...BASE_VERSION_INFO };
  curriculumCoursesFixture = [courseFixture({ evidenceId: null, confidence: null })];
  existingPlanFixture = null;

  await assert.rejects(
    prepareCurriculumPublish("version-1"),
    /neither evidenceId nor confidence/
  );

  assert.strictEqual(insertCalls.filter((c) => c.table === academicStudyPlans).length, 0);
});

test("prepareCurriculumPublish: one bad course among several good ones still blocks the whole publish", async () => {
  resetState();
  versionInfoFixture = { ...BASE_VERSION_INFO };
  curriculumCoursesFixture = [
    courseFixture({ id: "course-ok", evidenceId: "ev-1", confidence: "HIGH" }),
    courseFixture({ id: "course-bad", evidenceId: null, confidence: null }),
  ];
  existingPlanFixture = null;

  await assert.rejects(prepareCurriculumPublish("version-1"));
  assert.strictEqual(insertCalls.filter((c) => c.table === academicStudyPlans).length, 0);
});

// ── overwrite traceability (previous-value snapshot) ──────────────────────

test("prepareCurriculumPublish: new plan (no existing row) → overwrite is null, upsert still prepared", async () => {
  resetState();
  versionInfoFixture = { ...BASE_VERSION_INFO };
  curriculumCoursesFixture = [courseFixture({ evidenceId: "ev-1", confidence: "HIGH" })];
  existingPlanFixture = null;

  const result = await prepareCurriculumPublish("version-1");

  assert.strictEqual(result.overwrite, null);
  assert.ok(result.upsert);
});

test("prepareCurriculumPublish: overwriting an existing plan → result carries the previous values", async () => {
  resetState();
  versionInfoFixture = { ...BASE_VERSION_INFO };
  curriculumCoursesFixture = [courseFixture({ evidenceId: "ev-1", confidence: "HIGH" })];
  existingPlanFixture = {
    id: "plan-1",
    country: "jordan",
    university: "ju",
    specialization: "computer-science",
    totalCreditHours: 132,
    categories: JSON.stringify([{ name: "Old Category", creditHours: 132, courses: [] }]),
  };

  const result = await prepareCurriculumPublish("version-1");

  assert.deepStrictEqual(result.overwrite, {
    previousTotalCreditHours: 132,
    previousCategories: existingPlanFixture.categories,
  });
  assert.ok(result.upsert, "the same single upsert statement covers the overwrite case too");
});

// ── unrelated regression: existing "not approved" guard still works ──────

test("prepareCurriculumPublish: still blocks a non-approved version (pre-existing guard, unaffected by Phase 3/3.5B-2 changes)", async () => {
  resetState();
  versionInfoFixture = { ...BASE_VERSION_INFO, version: { ...BASE_VERSION_INFO.version, status: "draft" } };
  curriculumCoursesFixture = [];

  await assert.rejects(prepareCurriculumPublish("version-1"), /not approved/);
});

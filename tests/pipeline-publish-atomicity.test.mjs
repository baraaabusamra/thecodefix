import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";
import {
  pipelineCurriculumVersions,
  pipelineCurriculumCourses,
  pipelineCoursePrerequisites,
  academicStudyPlans,
  auditLogs,
} from "../src/db/schema.js";

// Phase 3.5B-2 fix (P1-B): publishCurriculum's academicStudyPlans write and
// its pipeline.curriculum.publish audit event now commit atomically via
// db.batch(), the same proven Neon HTTP transaction primitive used for
// approveReview/rejectReview. compileAndPublishCurriculum was split into
// prepareCurriculumPublish (read/validate/compile only — no write) plus a
// prepared, not-yet-executed onConflictDoUpdate query object that
// publishCurriculum submits alongside the audit insert in one batch.
//
// This suite models TRUE state, not call presence: the fake db's academic
// study plan "table" only reflects the upsert if the whole batch succeeds,
// and the previous-value snapshot is captured once, before any write, so a
// later retry cannot mistake an already-applied new value for the original.

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

let planTable = []; // in-memory academicStudyPlans rows: { country, university, specialization, totalCreditHours, categories }
let auditRows = []; // [{ userId, action, target, meta }]
let batchFailAt = null; // 0-based index into the batch array to fail at, or null

let versionInfoFixture = null; // { version, program, university }
let curriculumCoursesFixture = [];

function resetState() {
  planTable = [];
  auditRows = [];
  batchFailAt = null;
}

function findPlan(country, university, specialization) {
  return planTable.find(
    (p) => p.country === country && p.university === university && p.specialization === specialization
  );
}

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
            // Real WHERE-clause evaluation isn't modeled here; the test
            // fixtures always describe a single (country,university,
            // specialization) triple, so returning the current matching row
            // (or none) is equivalent and avoids re-deriving drizzle's SQL
            // condition internals for this suite's purposes.
            return makeChain(() => (planTable.length ? [planTable[0]] : []));
          }
          return makeChain(() => []);
        },
      };
    },
    insert(table) {
      return {
        values(values) {
          const item = {
            __kind: "insert",
            table,
            values,
            onConflictDoUpdate(config) {
              return { __kind: "upsert", table, values, config };
            },
          };
          return item;
        },
      };
    },
    async batch(items) {
      if (batchFailAt !== null && batchFailAt < items.length) {
        throw new Error(`INJECTED_BATCH_FAILURE at index ${batchFailAt}`);
      }
      for (const item of items) applyWrite(item);
      return items.map(() => undefined);
    },
  };
}

function applyWrite(item) {
  if (item.table === academicStudyPlans && (item.__kind === "upsert" || item.__kind === "insert")) {
    const { country, university, specialization } = item.values;
    const existing = findPlan(country, university, specialization);
    if (existing) {
      Object.assign(existing, item.__kind === "upsert" ? item.config.set : item.values);
    } else {
      planTable.push({ ...item.values });
    }
  } else if (item.table === auditLogs && item.__kind === "insert") {
    auditRows.push(item.values);
  }
}

let resolveAdminMock = async () => ({ ok: false, mode: "rbac", reason: "signin" });
let authMock = async () => null;

mock.module("@/db", { exports: { requireDb: () => fakeDb() } });
mock.module("@/lib/admin-access", { exports: { resolveAdmin: (...a) => resolveAdminMock(...a) } });
mock.module("@/auth", { exports: { auth: (...a) => authMock(...a) } });
mock.module("next/cache", { exports: { revalidatePath: () => {} } });

const { publishCurriculum } = await import(
  "../src/app/admin/pipeline/review/[id]/actions.js"
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
      evidenceId: "ev-1",
      confidence: "HIGH",
      ...overrides,
    },
    baseCourse: { id: "base-1", normalizedName: "Intro to CS" },
  };
}

function setup() {
  versionInfoFixture = { ...BASE_VERSION_INFO };
  curriculumCoursesFixture = [courseFixture({})];
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "owner" });
  authMock = async () => ({ user: { id: "user-owner" } });
}

function planKey() {
  return findPlan("jordan", "ju", "computer-science");
}

// ── 1-3: new-plan path ────────────────────────────────────────────────────

test("new plan: upsert fails → no plan, no audit", async () => {
  resetState();
  setup();
  batchFailAt = 0;

  const result = await publishCurriculum("version-1");

  assert.strictEqual(result.success, false);
  assert.strictEqual(planKey(), undefined);
  assert.strictEqual(auditRows.length, 0);
});

test("new plan: audit insert fails → no plan, no audit", async () => {
  resetState();
  setup();
  batchFailAt = 1;

  const result = await publishCurriculum("version-1");

  assert.strictEqual(result.success, false);
  assert.strictEqual(planKey(), undefined, "the upsert must not have applied either");
  assert.strictEqual(auditRows.length, 0);
});

test("new plan: full success → plan exists, exactly one publish audit", async () => {
  resetState();
  setup();
  batchFailAt = null;

  const result = await publishCurriculum("version-1");

  assert.deepStrictEqual(result, { success: true });
  const plan = planKey();
  assert.ok(plan, "plan must now exist");
  assert.strictEqual(plan.totalCreditHours, 3);
  assert.strictEqual(auditRows.length, 1);
  assert.strictEqual(auditRows[0].action, "pipeline.curriculum.publish");
  assert.strictEqual(auditRows[0].target, "version-1");
  const meta = JSON.parse(auditRows[0].meta);
  assert.strictEqual(meta.overwrite, null, "no prior plan existed");
});

// ── 4-6: existing-plan overwrite path ─────────────────────────────────────

function seedExistingPlan() {
  planTable = [
    {
      id: "plan-1",
      country: "jordan",
      university: "ju",
      specialization: "computer-science",
      totalCreditHours: 132,
      categories: JSON.stringify([{ name: "Old Category", creditHours: 132, courses: [] }]),
    },
  ];
}

test("existing plan overwrite: upsert fails → old plan A unchanged, no new audit", async () => {
  resetState();
  setup();
  seedExistingPlan();
  batchFailAt = 0;

  const result = await publishCurriculum("version-1");

  assert.strictEqual(result.success, false);
  assert.strictEqual(planKey().totalCreditHours, 132, "plan A must remain exactly as it was");
  assert.strictEqual(auditRows.length, 0);
});

test("existing plan overwrite: audit insert fails → old plan A unchanged, no new audit", async () => {
  resetState();
  setup();
  seedExistingPlan();
  batchFailAt = 1;

  const result = await publishCurriculum("version-1");

  assert.strictEqual(result.success, false);
  assert.strictEqual(planKey().totalCreditHours, 132, "the upsert must not have applied either");
  assert.strictEqual(auditRows.length, 0);
});

test("existing plan overwrite: full success → plan becomes B, one audit with previous=A", async () => {
  resetState();
  setup();
  seedExistingPlan();
  batchFailAt = null;

  const result = await publishCurriculum("version-1");

  assert.deepStrictEqual(result, { success: true });
  assert.strictEqual(planKey().totalCreditHours, 3, "plan is now B");
  assert.strictEqual(auditRows.length, 1);
  const meta = JSON.parse(auditRows[0].meta);
  assert.deepStrictEqual(meta.overwrite, {
    previousTotalCreditHours: 132,
    previousCategories: JSON.stringify([{ name: "Old Category", creditHours: 132, courses: [] }]),
  });
});

// ── 7: retry after a failed audit-position publish — mandatory regression ─

test("retry after failed audit insert: plan A survives, and the eventual audit still records the TRUE original A, not the failed attempt's B", async () => {
  resetState();
  setup();
  seedExistingPlan();

  // First attempt: batch fails at the audit-insert position.
  batchFailAt = 1;
  const firstResult = await publishCurriculum("version-1");
  assert.strictEqual(firstResult.success, false);
  assert.strictEqual(planKey().totalCreditHours, 132, "plan must still read as A after the failed attempt");
  assert.strictEqual(auditRows.length, 0);

  // Second attempt: succeeds fully.
  batchFailAt = null;
  const secondResult = await publishCurriculum("version-1");
  assert.deepStrictEqual(secondResult, { success: true });

  assert.strictEqual(planKey().totalCreditHours, 3, "plan is now B");
  assert.strictEqual(auditRows.length, 1, "exactly one audit row across both attempts");
  const meta = JSON.parse(auditRows[0].meta);
  assert.deepStrictEqual(
    meta.overwrite,
    {
      previousTotalCreditHours: 132,
      previousCategories: JSON.stringify([{ name: "Old Category", creditHours: 132, courses: [] }]),
    },
    "the audit's previous snapshot must describe the TRUE original A, not a value corrupted by the first failed attempt"
  );
});

// ── Governance regression: evidence/confidence floor unchanged ───────────

test("governance floor unchanged: evidenceId null AND confidence null still blocks publish before any write", async () => {
  resetState();
  setup();
  curriculumCoursesFixture = [courseFixture({ evidenceId: null, confidence: null })];

  const result = await publishCurriculum("version-1");

  assert.strictEqual(result.success, false);
  assert.match(result.error, /neither evidenceId nor confidence/);
  assert.strictEqual(planKey(), undefined);
  assert.strictEqual(auditRows.length, 0);
});

test("governance unchanged: not-approved version still blocked before any write", async () => {
  resetState();
  setup();
  versionInfoFixture = { ...BASE_VERSION_INFO, version: { ...BASE_VERSION_INFO.version, status: "draft" } };

  const result = await publishCurriculum("version-1");

  assert.strictEqual(result.success, false);
  assert.match(result.error, /not approved/);
  assert.strictEqual(planKey(), undefined);
  assert.strictEqual(auditRows.length, 0);
});

// ── Authorization regression ──────────────────────────────────────────────

test("unauthorized publish: zero compiler work, zero DB writes", async () => {
  resetState();
  setup();
  resolveAdminMock = async () => ({ ok: false, mode: "rbac", reason: "signin" });

  await assert.rejects(publishCurriculum("version-1"), /Forbidden/);

  assert.strictEqual(planKey(), undefined);
  assert.strictEqual(auditRows.length, 0);
});

test("wrong role (lacks content:edit): zero DB writes", async () => {
  resetState();
  setup();
  resolveAdminMock = async () => ({ ok: true, mode: "rbac", role: "operations" });

  await assert.rejects(publishCurriculum("version-1"), /Forbidden/);

  assert.strictEqual(planKey(), undefined);
  assert.strictEqual(auditRows.length, 0);
});

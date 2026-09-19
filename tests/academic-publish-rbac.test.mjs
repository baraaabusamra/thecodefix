import test, { mock } from "node:test";
import assert from "node:assert";
import { eq } from "drizzle-orm";
import { createTestDb, dbModuleExports } from "./helpers/pglite.mjs";

// Academic study plans follow the same editorial rule as CMS lessons:
// writers draft / submit for review; content:publish (admin, owner) publishes
// or takes plans down. Real Server Actions + real RBAC + real public reader,
// on PGlite with the committed migrations.

const { db, schema } = await createTestDb();
mock.module("@/db", { exports: dbModuleExports(db) });

let role = "writer";
mock.module("@/lib/admin-access", {
  exports: { resolveAdmin: async () => ({ ok: true, mode: "rbac", role }) },
});
mock.module("@/lib/academic-universities", {
  exports: {
    getUniversity: () => ({ slug: "uni", specializations: ["cs", "se", "ai", "ds"] }),
    getSpecialization: (s) => ({ slug: s, title: s.toUpperCase() }),
  },
});
mock.module("next/cache", { exports: { revalidatePath: () => {} } });
mock.module("next/navigation", {
  exports: {
    redirect: (to) => {
      throw Object.assign(new Error("NEXT_REDIRECT"), { to });
    },
  },
});

const { saveStudyPlan, deleteStudyPlan } = await import("../src/app/admin/academic/actions.ts");
const { getStudyPlan } = await import("../src/lib/academic-study-plans.ts");

async function run(fn, fields) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  try {
    await fn(fd);
    return {};
  } catch (e) {
    return e.message === "NEXT_REDIRECT" ? { redirect: e.to } : { error: e.message };
  }
}
const plan = (spec, extra = {}) => ({
  country: "jo",
  university: "uni",
  specialization: spec,
  programNameEn: `Program ${spec}`,
  categoriesJson: "[]",
  ...extra,
});
async function stored(spec) {
  const [r] = await db
    .select()
    .from(schema.academicStudyPlans)
    .where(eq(schema.academicStudyPlans.specialization, spec));
  return r;
}
// The public reader is React-cache()d per request; a fresh import gives a
// fresh request scope.
async function publicPlan(spec) {
  const m = await import(`../src/lib/academic-study-plans.ts?r=${Math.random()}`);
  return m.getStudyPlan("jo", "uni", spec);
}

test("writer: a new plan is saved as a draft even if 'published' is requested", async () => {
  role = "writer";
  const res = await run(saveStudyPlan, plan("cs", { status: "published" }));
  assert.match(res.redirect, /saved=1/);
  assert.equal((await stored("cs")).status, "draft");
  assert.equal(await publicPlan("cs"), null, "drafts are not public");
  assert.equal((await getStudyPlan("jo", "uni", "cs", { includeUnpublished: true })).status, "draft");
});

test("writer: can submit a draft for review (still not public)", async () => {
  role = "writer";
  await run(saveStudyPlan, plan("cs", { submitForReview: "on" }));
  assert.equal((await stored("cs")).status, "review");
  assert.equal(await publicPlan("cs"), null);
});

test("admin (content:publish): publishes, and the plan becomes public", async () => {
  role = "admin";
  await run(saveStudyPlan, plan("cs", { status: "published" }));
  assert.equal((await stored("cs")).status, "published");
  assert.ok(await publicPlan("cs"));
});

test("writer: cannot edit (or silently unpublish) a published plan", async () => {
  role = "writer";
  const res = await run(saveStudyPlan, plan("cs", { programNameEn: "Hijacked" }));
  assert.match(res.redirect, /error=locked/);
  const row = await stored("cs");
  assert.equal(row.programNameEn, "Program cs");
  assert.equal(row.status, "published");
});

test("writer: cannot delete a published plan, can delete an own draft", async () => {
  role = "writer";
  const live = await stored("cs");
  assert.equal((await run(deleteStudyPlan, { id: live.id })).error, "Forbidden");
  assert.ok(await stored("cs"));

  await run(saveStudyPlan, plan("se"));
  const draft = await stored("se");
  assert.match((await run(deleteStudyPlan, { id: draft.id })).redirect, /saved=deleted/);
  assert.equal(await stored("se"), undefined);
});

test("admin: can suspend a plan, which removes it from public readers", async () => {
  role = "admin";
  await run(saveStudyPlan, plan("cs", { status: "suspended" }));
  assert.equal((await stored("cs")).status, "suspended");
  assert.equal(await publicPlan("cs"), null);
});

test("roles without content:edit can't touch academic plans at all", async () => {
  for (const r of ["student", "creator", "support", "sales", "operations", "marketing", "designer"]) {
    role = r;
    assert.equal((await run(saveStudyPlan, plan("ai"))).error, "Forbidden", r);
  }
  assert.equal(await stored("ai"), undefined);
});

test("categoriesJson must be an array", async () => {
  role = "admin";
  const res = await run(saveStudyPlan, plan("ds", { categoriesJson: '{"not":"an array"}' }));
  assert.match(res.redirect, /error=json/);
  assert.equal(await stored("ds"), undefined);
});

test("existing rows keep being public: the migration default is 'published'", async () => {
  await db.insert(schema.academicStudyPlans).values({
    country: "jo",
    university: "uni",
    specialization: "legacy",
    categories: "[]",
  });
  assert.equal((await stored("legacy")).status, "published");
});

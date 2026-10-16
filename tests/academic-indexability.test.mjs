import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

// RF-01 remediation (reports/seo-spam-audit-2026-08-28/): the Academic
// Indexability Quality Gate. Every case here is pure — real fixture slugs
// from content/data/academic-universities/*.json (read-only files, not the
// DB) for route-validity, and hand-built StudyPlan objects for the
// publishability checks. NO Neon/production database is touched anywhere
// in this file: isStudyPlanPublishable() takes a plain object, it never
// calls getStudyPlan()/the db itself.
//
// The approved-decision's "draft / unapproved / rejected" vocabulary (tests
// 7-9 below) has no literal matching field on the `academic_study_plan`
// table by design — see the schema comment on academicStudyPlans and the
// long comment above isStudyPlanPublishable() in
// modules/academic/src/indexability.ts for why existence in that table already
// means "published", and why completeness/sourcing is therefore what the
// gate actually has to check. These tests exercise that mapping directly:
// an empty `source` stands in for "unsourced", empty `categories` for
// "no real content was ever entered (unapproved/placeholder)", etc.

const { resolveAcademicRoute, isStudyPlanPublishable } = await import(
  "../modules/academic/src/indexability.js"
);

function completePlan(overrides = {}) {
  return {
    programNameEn: "B.Sc. Computer Science",
    degree: "بكالوريوس",
    totalCreditHours: 132,
    source: "Cairo University official catalog",
    sourceDate: "2026-01-01",
    categories: [
      {
        name: "Core",
        creditHours: 3,
        courses: [
          { number: "CS101", name: "Intro to Programming", creditHours: 3, theoretical: 3, practical: 0 },
        ],
      },
    ],
    origin: "db",
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

// ── Route validity (404 cases) ─────────────────────────────────────────

test("1. unknown country returns no route (404)", () => {
  assert.strictEqual(resolveAcademicRoute("narnia", "cairo-university", "computer-science"), null);
});

test("2. unknown university returns no route (404)", () => {
  assert.strictEqual(resolveAcademicRoute("egypt", "not-a-real-university", "computer-science"), null);
});

test("3. university/country mismatch returns no route (404)", () => {
  // university-of-jordan is real, but only inside jordan.json — looking it
  // up under egypt must fail exactly like an unknown university would.
  assert.strictEqual(resolveAcademicRoute("egypt", "university-of-jordan", "computer-science"), null);
});

test("4. specialization not offered by the university returns no route (404)", () => {
  // cairo-university's real specializations are computer-science,
  // information-technology, artificial-intelligence — cybersecurity is a
  // real, known specialization slug, just not one this university offers.
  assert.strictEqual(resolveAcademicRoute("egypt", "cairo-university", "cybersecurity"), null);
});

test("4b. unknown specialization slug entirely returns no route (404)", () => {
  assert.strictEqual(resolveAcademicRoute("egypt", "cairo-university", "underwater-basket-weaving"), null);
});

test("valid combo resolves a real route (not a 404 case)", () => {
  const route = resolveAcademicRoute("egypt", "cairo-university", "computer-science");
  assert.ok(route);
  assert.strictEqual(route.university.slug, "cairo-university");
  assert.strictEqual(route.specialization.slug, "computer-science");
});

// ── Publishability (indexable vs. noindex,follow) ──────────────────────

test("5. valid university/specialization with no plan at all -> not publishable (page stays 200, must be noindex,follow)", () => {
  assert.strictEqual(isStudyPlanPublishable(null), false);
  assert.strictEqual(isStudyPlanPublishable(undefined), false);
});

test("7. unsourced plan (stands in for 'draft') is non-indexable", () => {
  assert.strictEqual(isStudyPlanPublishable(completePlan({ source: "" })), false);
  assert.strictEqual(isStudyPlanPublishable(completePlan({ sourceDate: "" })), false);
});

test("8. placeholder/empty-content plan (stands in for 'unapproved') is non-indexable", () => {
  assert.strictEqual(isStudyPlanPublishable(completePlan({ categories: [] })), false);
  assert.strictEqual(
    isStudyPlanPublishable(completePlan({ categories: [{ name: "Core", creditHours: 0, courses: [] }] })),
    false
  );
  assert.strictEqual(isStudyPlanPublishable(completePlan({ totalCreditHours: 0 })), false);
});

test("9. incomplete plan (missing program name) is non-indexable", () => {
  assert.strictEqual(isStudyPlanPublishable(completePlan({ programNameEn: "" })), false);
  assert.strictEqual(isStudyPlanPublishable(completePlan({ programNameEn: "   " })), false);
});

test("10. a complete, sourced plan with real courses is publishable/indexable", () => {
  assert.strictEqual(isStudyPlanPublishable(completePlan()), true);
});

// ── Sitemap filtering (pure, mirrors apps/web/src/app/sitemap.ts's exact `.filter`) ──

test("6. & 12. sitemap-candidate filtering excludes every non-publishable plan, keeps only the real one", () => {
  const candidates = [
    { key: "egypt/cairo-university/computer-science", plan: completePlan() },
    { key: "egypt/ain-shams-university/computer-science", plan: null },
    { key: "jordan/university-of-jordan/computer-science", plan: completePlan({ source: "" }) },
    { key: "saudi-arabia/kau/computer-science", plan: completePlan({ categories: [] }) },
  ];
  const sitemapEntries = candidates.filter((c) => isStudyPlanPublishable(c.plan));
  assert.strictEqual(sitemapEntries.length, 1);
  assert.strictEqual(sitemapEntries[0].key, "egypt/cairo-university/computer-science");
});

// ── Rendering / source-level regression guards ─────────────────────────

const PAGE_SRC = fs.readFileSync(
  path.join(process.cwd(), "apps", "web", "src", "app", "academic", "[country]", "[university]", "[specialization]", "page.tsx"),
  "utf-8"
);
const SITEMAP_SRC = fs.readFileSync(path.join(process.cwd(), "apps", "web", "src", "app", "sitemap.ts"), "utf-8");
const ROBOTS_SRC = fs.readFileSync(path.join(process.cwd(), "apps", "web", "src", "app", "robots.ts"), "utf-8");

test("11. the duplicated generic course-list fallback is no longer rendered", () => {
  assert.ok(!PAGE_SRC.includes("getAcademicCourse"), "page must no longer import/call getAcademicCourse");
  assert.ok(!PAGE_SRC.includes("fallbackCourses"), "the old shared fallbackCourses list must be gone");
  assert.ok(!PAGE_SRC.includes("courseSlugs.map"), "must not map over the shared courseSlugs list to render cards");
});

test("13. page metadata, rendering, and sitemap all consume the SAME gate module (no duplicated eligibility logic)", () => {
  assert.ok(PAGE_SRC.includes('from "@tcf/academic/indexability"'));
  assert.ok(SITEMAP_SRC.includes('from "@tcf/academic/indexability"'));
  // Both call sites must use the exported gate functions, not reimplement
  // their own totalCreditHours/source/categories checks inline.
  assert.ok(!SITEMAP_SRC.includes("totalCreditHours >"), "sitemap.ts must not reimplement the completeness check inline");
});

test("14. robots.txt does not disallow /academic (Google must be able to crawl and see the noindex tag)", () => {
  assert.ok(!/disallow:\s*\[[^\]]*"\/academic"/i.test(ROBOTS_SRC.replace(/\s+/g, " ")));
  assert.ok(ROBOTS_SRC.includes('"/admin"') && ROBOTS_SRC.includes('"/api/"'));
});

import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

// The "forgotten check" gap.
//
// src/app/admin/layout.tsx gates the whole admin area on `admin:view` only.
// Every role except student and creator holds `admin:view` — support, writer,
// sales, marketing and designer all do. So a new admin page that renders data
// without its OWN capability check is not protected by the layout: it is
// reachable by any of them.
//
// tests/rbac-matrix.test.mjs already forces every exported Server Action to
// declare its authorization expectation. This does the same for the pages,
// which are the other half of the admin surface.
//
// A page satisfies this either by calling `can(access.role, "<capability>")`
// or by being listed in EXEMPT below with a reason. Adding an admin page
// without doing one of the two fails this suite.

const ADMIN_DIR = path.join(process.cwd(), "src", "app", "admin");

// Pages that legitimately gate on nothing beyond `admin:view`.
const EXEMPT = {
  "src/app/admin/layout.tsx":
    "the shell itself — it resolves access once and renders the sign-in / " +
    "forbidden / unavailable gates that every page below it relies on",
  "src/app/admin/page.tsx":
    "the dashboard is capability-aware rather than capability-gated: it " +
    "renders only the cards capabilitiesFor(role) allows, so admin:view is " +
    "the correct bar for reaching it",
  "src/app/admin/operations/page.tsx":
    "no content of its own — an unconditional redirect to " +
    "/admin/operations/instructors, which runs its own ops:manage check",
};

// Capability each admin page is expected to require. Locking these means a
// page cannot be quietly downgraded (e.g. settings:manage -> content:edit)
// without the change showing up here.
const EXPECTED = {
  "src/app/admin/academic/edit/page.tsx": ["content:edit", "content:publish"],
  "src/app/admin/academic/page.tsx": ["content:edit"],
  "src/app/admin/billing/page.tsx": ["billing:manage"],
  "src/app/admin/changelog/page.tsx": ["content:edit"],
  "src/app/admin/content/[track]/[lesson]/page.tsx": ["content:edit"],
  "src/app/admin/content/db/[id]/page.tsx": ["content:edit", "content:publish"],
  "src/app/admin/content/page.tsx": ["content:edit", "content:publish"],
  "src/app/admin/creators/[id]/page.tsx": ["creators:review"],
  "src/app/admin/creators/page.tsx": ["creators:review"],
  "src/app/admin/creators/submissions/[id]/page.tsx": ["creators:review"],
  "src/app/admin/creators/submissions/page.tsx": ["creators:review"],
  "src/app/admin/diagnostics/page.tsx": ["content:edit"],
  "src/app/admin/jobs/[slug]/page.tsx": ["jobs:moderate"],
  "src/app/admin/jobs/page.tsx": ["jobs:moderate"],
  "src/app/admin/operations/content/page.tsx": ["content:edit", "ops:manage"],
  "src/app/admin/operations/instructors/[id]/page.tsx": [
    "billing:manage",
    "ops:manage",
  ],
  "src/app/admin/operations/instructors/page.tsx": ["ops:manage"],
  "src/app/admin/operations/outreach/page.tsx": ["ops:manage"],
  "src/app/admin/operations/tickets/[id]/page.tsx": ["ops:manage"],
  "src/app/admin/operations/tickets/page.tsx": ["ops:manage"],
  "src/app/admin/pipeline/test/page.tsx": ["settings:manage"],
  "src/app/admin/quizzes/[track]/page.tsx": ["content:edit"],
  "src/app/admin/quizzes/page.tsx": ["content:edit", "settings:manage"],
  "src/app/admin/reports/page.tsx": ["reports:review", "reports:submit"],
  "src/app/admin/roadmap/page.tsx": ["content:edit"],
  "src/app/admin/seo/page.tsx": ["seo:manage"],
  "src/app/admin/settings/page.tsx": ["settings:manage"],
  "src/app/admin/suggestions/page.tsx": ["content:edit"],
  "src/app/admin/users/page.tsx": ["users:manage"],
};

function adminRouteFiles() {
  const out = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name === "page.tsx" || entry.name === "layout.tsx") {
        out.push(path.relative(process.cwd(), p).replaceAll("\\", "/"));
      }
    }
  };
  walk(ADMIN_DIR);
  return out.sort();
}

/** Capabilities a file checks via `can(access.role, "...")`. */
function declaredCapabilities(file) {
  const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
  const caps = new Set();
  for (const m of source.matchAll(/can\(\s*[\w.?]+\s*,\s*"([a-z]+:[a-z]+)"/g)) {
    caps.add(m[1]);
  }
  return [...caps].sort();
}

test("every admin page gates on a capability or is explicitly exempt", () => {
  const undeclared = [];
  for (const file of adminRouteFiles()) {
    if (file in EXEMPT) continue;
    if (declaredCapabilities(file).length === 0) undeclared.push(file);
  }

  assert.deepStrictEqual(
    undeclared,
    [],
    "these admin routes check no capability of their own. The admin layout " +
      "only gates admin:view, which support/writer/sales/marketing/designer " +
      "all hold — so they are reachable by those roles. Add a " +
      "`can(access.role, \"<capability>\")` check, or add the file to EXEMPT " +
      "in this test with the reason it needs none."
  );
});

test("admin page capabilities match the locked expectations", () => {
  const actual = {};
  for (const file of adminRouteFiles()) {
    if (file in EXEMPT) continue;
    actual[file] = declaredCapabilities(file);
  }

  assert.deepStrictEqual(
    actual,
    EXPECTED,
    "an admin page's required capability changed. That is a real " +
      "authorization change, not a refactor — confirm it is intended and " +
      "update EXPECTED in this test."
  );
});

test("every exempt file still exists and is still a route", () => {
  const routes = new Set(adminRouteFiles());
  const stale = Object.keys(EXEMPT).filter((f) => !routes.has(f));
  assert.deepStrictEqual(
    stale,
    [],
    "EXEMPT lists files that are no longer admin routes — drop them so the " +
      "exemption list cannot quietly cover a path that came back later"
  );
});

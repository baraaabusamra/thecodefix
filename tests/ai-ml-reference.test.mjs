import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

// Structural guarantees for the AI/ML Arabic reference section.
//
// The reference section auto-discovers via REF_SECTIONS in src/lib/reference.ts
// and reads its entries from src/content/reference/ai-ml.json. A malformed
// entry is not cosmetic:
//   - a missing/empty slug breaks the [section]/[slug] route
//   - a `related` slug that does not resolve is silently dropped (the page
//     filters via `getRefEntry(...)` — see src/app/reference/[section]/[slug])
//   - a duplicated keyword inside one section is exactly the case
//     scripts/check-ref-keyword-overlap.mjs flags
//
// This file is the first-line guarantee. The broader check:* scripts run in CI
// also cover the JSON, but those are advisory/informational on overlap and not
// unit-tested per section. Per-section tests give a clear failure pin.

const DATA_PATH = path.join(
  process.cwd(),
  "src",
  "content",
  "reference",
  "ai-ml.json"
);

const REQUIRED_ENTRY_FIELDS = [
  "slug",
  "name",
  "title",
  "category",
  "summary",
  "description",
  "syntax",
  "example",
];

const ENTRY_COUNT = 30;

// Topics that are explicitly out of scope for the AI/ML reference (Wave 6–8
// subjects — RAG, agents, vector DBs, prompt engineering, MLOps, LLM app
// engineering). Slugs/names containing any of these signals would indicate
// scope creep into content we deliberately deferred.
const FORBIDDEN_SLUG_TOKENS = [
  "rag",
  "agent",
  "vector-database",
  "vector-store",
  "prompt-engineering",
  "mlops",
  "llm-app",
];

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

test("the AI/ML reference data file exists and parses as JSON", () => {
  assert.ok(fs.existsSync(DATA_PATH), `missing data file at ${DATA_PATH}`);
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  assert.doesNotThrow(() => JSON.parse(raw), "ai-ml.json is not valid JSON");
});

const entries = JSON.parse(fs.readFileSync(DATA_PATH, "utf8"));

test("the file holds a top-level array", () => {
  assert.ok(Array.isArray(entries), "expected an array of entries");
});

// -----------------------------------------------------------------------------
// Section registration in REF_SECTIONS
// -----------------------------------------------------------------------------

test("the ai-ml section is registered in REF_SECTIONS", async () => {
  const { REF_SECTIONS, getRefSection } = await import(
    "../src/lib/reference.ts"
  );
  const aiMl = REF_SECTIONS.find((s) => s.slug === "ai-ml");
  assert.ok(aiMl, "ai-ml section must be registered in REF_SECTIONS");
  assert.equal(getRefSection("ai-ml") !== null, true);
  assert.equal(aiMl.entityLabel, "مفهوم");
  assert.equal(aiMl.icon, "🧠");
  assert.equal(aiMl.track, "ai-ml");
  assert.equal(aiMl.playgroundMode, "none");
  assert.equal(aiMl.attributesTitle, "أهم النقاط");
  assert.equal(aiMl.attributesHeader, "النقطة");
});

test("getRefEntries('ai-ml') returns the file contents", async () => {
  const { getRefEntries } = await import("../src/lib/reference.ts");
  const loaded = getRefEntries("ai-ml");
  assert.equal(loaded.length, entries.length);
  assert.equal(loaded.length, ENTRY_COUNT);
});

// -----------------------------------------------------------------------------
// Entry count + shape
// -----------------------------------------------------------------------------

test(`the AI/ML reference has exactly ${ENTRY_COUNT} entries`, () => {
  assert.equal(entries.length, ENTRY_COUNT);
});

test("every entry matches the required shape and has non-empty fields", () => {
  const problems = [];
  for (const [i, e] of entries.entries()) {
    const where = e?.slug ?? `index ${i}`;
    for (const field of REQUIRED_ENTRY_FIELDS) {
      if (typeof e[field] !== "string" || !e[field].trim()) {
        problems.push(`${where}: ${field} must be a non-empty string`);
      }
    }
    if (e.related && !Array.isArray(e.related)) {
      problems.push(`${where}: related must be an array`);
    }
    if (e.attributes && !Array.isArray(e.attributes)) {
      problems.push(`${where}: attributes must be an array`);
    }
    if (e.tips && !Array.isArray(e.tips)) {
      problems.push(`${where}: tips must be an array`);
    }
    if (e.mistakes && !Array.isArray(e.mistakes)) {
      problems.push(`${where}: mistakes must be an array`);
    }
    if (e.keywords && !Array.isArray(e.keywords)) {
      problems.push(`${where}: keywords must be an array`);
    }
  }
  assert.deepStrictEqual(problems, []);
});

test("every entry has a unique slug", () => {
  const seen = new Map();
  const dupes = [];
  for (const e of entries) {
    if (seen.has(e.slug)) dupes.push(`${e.slug} (also at ${seen.get(e.slug)})`);
    seen.set(e.slug, true);
  }
  assert.deepStrictEqual(dupes, []);
});

test("every entry has a unique name", () => {
  const seen = new Map();
  const dupes = [];
  for (const e of entries) {
    if (seen.has(e.name)) dupes.push(`${e.name} (slug=${e.slug})`);
    seen.set(e.name, true);
  }
  assert.deepStrictEqual(dupes, []);
});

// -----------------------------------------------------------------------------
// Related links resolve within the section
// -----------------------------------------------------------------------------

test("every related[] slug resolves to another entry in the same section", () => {
  const slugs = new Set(entries.map((e) => e.slug));
  const problems = [];
  for (const e of entries) {
    if (!Array.isArray(e.related)) continue;
    for (const r of e.related) {
      if (typeof r !== "string" || !r.trim()) {
        problems.push(`${e.slug}: related has an empty entry`);
        continue;
      }
      if (!slugs.has(r)) {
        problems.push(`${e.slug}: related slug "${r}" does not resolve`);
      }
      if (r === e.slug) {
        problems.push(`${e.slug}: cannot relate to itself`);
      }
    }
  }
  assert.deepStrictEqual(problems, []);
});

// -----------------------------------------------------------------------------
// Keyword uniqueness (matches scripts/check-ref-keyword-overlap semantics)
// -----------------------------------------------------------------------------

test("no two entries share the exact same keyword (case-insensitive)", () => {
  const seen = new Map();
  const dupes = [];
  for (const e of entries) {
    if (!Array.isArray(e.keywords)) continue;
    for (const kw of e.keywords) {
      const key = String(kw).trim().toLowerCase();
      if (!key) continue;
      if (seen.has(key)) {
        dupes.push(
          `"${key}" appears in both ${seen.get(key)} and ${e.slug}`
        );
      } else {
        seen.set(key, e.slug);
      }
    }
  }
  assert.deepStrictEqual(
    dupes,
    [],
    "duplicated keywords fragment topical authority across entries"
  );
});

// -----------------------------------------------------------------------------
// Source handling — generic sourceUrl/label, no legacy mdn for AI/ML
// -----------------------------------------------------------------------------

test("no AI/ML entry uses the legacy `mdn` field", () => {
  const offenders = entries
    .filter((e) => typeof e.mdn === "string" && e.mdn.trim())
    .map((e) => e.slug);
  assert.deepStrictEqual(
    offenders,
    [],
    "AI/ML entries should use the generic sourceUrl/sourceLabel fields — MDN is web-only"
  );
});

test("sourceLabel is set whenever sourceUrl is set", () => {
  const problems = [];
  for (const e of entries) {
    if (e.sourceUrl && (!e.sourceLabel || !e.sourceLabel.trim())) {
      problems.push(`${e.slug}: sourceUrl requires a non-empty sourceLabel`);
    }
    if (e.sourceLabel && !e.sourceUrl) {
      problems.push(
        `${e.slug}: sourceLabel set without sourceUrl is dangling`
      );
    }
  }
  assert.deepStrictEqual(problems, []);
});

test("at least one AI/ML entry ships an external sourceUrl/sourceLabel pair", () => {
  const withSource = entries.filter((e) => e.sourceUrl && e.sourceLabel);
  assert.ok(
    withSource.length >= 5,
    `expected ≥5 entries with external sources; found ${withSource.length}`
  );
});

// -----------------------------------------------------------------------------
// MDN backward compatibility — pre-existing web sections still render via mdn
// -----------------------------------------------------------------------------

test("legacy MDN-backed sections still have entries with `mdn` set", () => {
  const htmlPath = path.join(
    process.cwd(),
    "src",
    "content",
    "reference",
    "html.json"
  );
  if (!fs.existsSync(htmlPath)) {
    // If the html section has been removed this assertion becomes moot; skip.
    return;
  }
  const html = JSON.parse(fs.readFileSync(htmlPath, "utf8"));
  const withMdn = html.filter((e) => typeof e.mdn === "string" && e.mdn.trim());
  assert.ok(
    withMdn.length > 0,
    "the html section should keep `mdn` entries — the legacy rendering branch " +
      "must remain exercised so the generic sourceUrl path is a strict superset"
  );
});

// -----------------------------------------------------------------------------
// Render path coverage — the page renders sourceUrl → mdn → nothing
// -----------------------------------------------------------------------------

test("the reference page renders sourceUrl preferentially and labels it", async () => {
  const { getRefEntry } = await import("../src/lib/reference.ts");
  const overfitting = getRefEntry("ai-ml", "overfitting");
  assert.ok(overfitting, "overfitting entry should resolve");
  assert.ok(
    overfitting.sourceUrl,
    "overfitting must carry a sourceUrl (proves the generic path is exercised)"
  );
  assert.equal(typeof overfitting.sourceLabel, "string");
});

test("the reference page rendering precedence is sourceUrl → mdn → none", () => {
  // Source code guard — encode the precedence the page renderer relies on.
  // If anyone changes the order, the regression test fires here.
  const pageSrc = fs.readFileSync(
    path.join(
      process.cwd(),
      "src",
      "app",
      "reference",
      "[section]",
      "[slug]",
      "page.tsx"
    ),
    "utf8"
  );

  // The precedence expression should live in a single block where both
  // branches (sourceUrl / mdn) are handled, with no duplicate "fallback" mdn
  // block elsewhere in the file.
  const precedenceMatches = pageSrc.match(/entry\.sourceUrl\s*\?\?\s*entry\.mdn/g);
  assert.ok(
    precedenceMatches && precedenceMatches.length >= 1,
    "expected `entry.sourceUrl ?? entry.mdn` precedence in the page renderer"
  );
  // And the fallback should branch by which field is present, so MDN legacy
  // entries still show "MDN Web Docs" rather than the generic label.
  assert.ok(
    pageSrc.includes('"MDN Web Docs"'),
    "the legacy `mdn` branch must still label links as MDN Web Docs"
  );
});

// -----------------------------------------------------------------------------
// Scope guard — no Wave 6–8 topics slipped in
// -----------------------------------------------------------------------------

test("no Wave 6–8 forbidden topics appear as slugs or names", () => {
  const problems = [];
  for (const e of entries) {
    for (const token of FORBIDDEN_SLUG_TOKENS) {
      if (e.slug.includes(token) || e.slug.endsWith(`-${token}`)) {
        problems.push(`${e.slug}: slug contains forbidden token "${token}"`);
      }
      const nameLc = e.name.toLowerCase();
      if (nameLc.includes(token.replace(/-/g, " "))) {
        problems.push(`${e.slug}: name contains forbidden token "${token}"`);
      }
    }
  }
  assert.deepStrictEqual(problems, []);
});

// -----------------------------------------------------------------------------
// Discoverability — REF_SECTIONS feeds sitemap + section page
// -----------------------------------------------------------------------------

test("REF_SECTIONS registration ensures sitemap and section page include ai-ml", async () => {
  const { REF_SECTIONS } = await import("../src/lib/reference.ts");
  const aiMl = REF_SECTIONS.find((s) => s.slug === "ai-ml");
  assert.ok(aiMl, "ai-ml missing from REF_SECTIONS");
  // Both sitemap.ts and reference/[section]/page.tsx iterate REF_SECTIONS, so
  // any section in the array is automatically indexable and listed.
  const sitemapSrc = fs.readFileSync(
    path.join(process.cwd(), "src", "app", "sitemap.ts"),
    "utf8"
  );
  assert.ok(
    /REF_SECTIONS/.test(sitemapSrc),
    "sitemap.ts must iterate REF_SECTIONS to include ai-ml"
  );
  const sectionPageSrc = fs.readFileSync(
    path.join(
      process.cwd(),
      "src",
      "app",
      "reference",
      "[section]",
      "page.tsx"
    ),
    "utf8"
  );
  assert.ok(
    /REF_SECTIONS/.test(sectionPageSrc),
    "the section index page must iterate REF_SECTIONS"
  );
});

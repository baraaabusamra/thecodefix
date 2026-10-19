// Unit tests for scripts/seo/lib.mjs (the SEO growth skills' shared logic).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isoWeek,
  weekMonth,
  validateSnapshot,
  scenarioFor,
  aggregate,
  sourceFor,
  proseWords,
  demandImpressions,
  bandForWeek,
  rows,
  sha256,
  weekSummary,
} from "../scripts/seo/lib.mjs";

const snap = () => ({
  schema: 1,
  week: "2026-W41",
  start: "2026-10-05",
  end: "2026-10-11",
  complete: true,
  totals: { clicks: 4, impressions: 44, position: 26.8 },
  buckets: { brand: { clicks: 1, impressions: 2 }, site: { clicks: 0, impressions: 5 }, other: { clicks: 1, impressions: 9 }, anonymized_impressions: 28 },
  columns: {
    daily: ["date", "clicks", "impressions", "position"],
    pages: ["path", "clicks", "impressions", "position"],
    queries: ["query", "bucket", "clicks", "impressions", "position"],
    page_queries: ["path", "query", "clicks", "impressions", "position"],
  },
  daily: [["2026-10-05", 2, 40, 5], ["2026-10-06", 2, 4, 9]],
  pages: [["/blog/x", 1, 3, 3]],
  queries: [["foo", "other", 0, 2, 12]],
  page_queries: [["/blog/x", "foo", 0, 2, 12]],
  inspections: [],
});

test("isoWeek matches Python's isocalendar for the weeks we store", () => {
  assert.equal(isoWeek("2026-06-22"), "2026-W26");
  assert.equal(isoWeek("2026-10-05"), "2026-W41");
  assert.equal(isoWeek("2026-10-12"), "2026-W42");
  assert.equal(isoWeek("2026-12-28"), "2026-W53");
  assert.equal(isoWeek("2027-01-04"), "2027-W01");
  assert.equal(isoWeek("2027-01-03"), "2026-W53"); // Sunday belongs to the previous ISO year
});

test("weekMonth uses the week's Thursday", () => {
  assert.equal(weekMonth("2026-09-28"), "2026-10"); // Thu 1 Oct
  assert.equal(weekMonth("2026-10-26"), "2026-10"); // Thu 29 Oct
  assert.equal(weekMonth("2026-11-30"), "2026-12"); // Thu 3 Dec
});

test("validateSnapshot accepts a well-formed snapshot and rejects broken ones", () => {
  assert.deepEqual(validateSnapshot(snap(), "2026-W41.json"), []);
  assert.match(validateSnapshot(snap(), "2026-W40.json").join(), /file name/);
  const bad = snap();
  bad.daily[0][2] = 1;
  assert.match(validateSnapshot(bad).join(), /daily impressions/);
  const short = snap();
  short.pages[0].pop();
  assert.match(validateSnapshot(short).join(), /pages\[0\]/);
  const tue = snap();
  tue.start = "2026-10-06";
  assert.match(validateSnapshot(tue).join(), /Monday/);
});

test("demand impressions exclude site: owner checks", () => {
  assert.equal(demandImpressions(snap()), 39);
});

test("weeks dominated by site: checks are flagged", () => {
  assert.equal(weekSummary(snap()).ownerCheck, false); // 5/44 = 11%
  const s = snap();
  s.buckets.site.impressions = 20;
  assert.equal(weekSummary(s).ownerCheck, true); // 20/44 = 45%
});

test("rows() maps cells to column names", () => {
  assert.deepEqual(rows(snap(), "queries")[0], { query: "foo", bucket: "other", clicks: 0, impressions: 2, position: 12 });
});

test("aggregate weights position by impressions", () => {
  const out = aggregate(
    [
      { k: "a", clicks: 1, impressions: 10, position: 5 },
      { k: "a", clicks: 0, impressions: 30, position: 15 },
    ],
    (r) => r.k,
  );
  assert.deepEqual(out, [{ key: "a", clicks: 1, impressions: 40, position: 12.5 }]);
});

test("scenarioFor picks the nearest band point and flags values outside it", () => {
  const band = [60, 150, 300];
  assert.equal(scenarioFor(40, band).label, "below-pessimistic");
  assert.equal(scenarioFor(90, band).label, "pessimistic");
  assert.equal(scenarioFor(160, band).label, "expected");
  assert.equal(scenarioFor(280, band).label, "optimistic");
  assert.equal(scenarioFor(301, band).label, "above-optimistic");
});

test("bandForWeek reads the month the week belongs to", () => {
  const fc = { months: { "2026-11": { pessimistic: 1, expected: 2, optimistic: 3 } } };
  assert.deepEqual(bandForWeek(fc, "2026-11-02"), { month: "2026-11", band: [1, 2, 3] });
  assert.equal(bandForWeek(fc, "2026-10-05"), null);
});

test("sourceFor maps URLs to V2 and V1 files and follows lesson moves", () => {
  const exists = () => true;
  assert.deepEqual(sourceFor("/blog/http-500-error", { exists }), {
    path: "/blog/http-500-error",
    kind: "blog",
    v2: "content/ar/blog/http-500-error.mdx",
    v1: "src/content/blog/http-500-error.mdx",
    exists: true,
    moved: false,
  });
  const moved = sourceFor("/learn/dsa/01-arrays-lists", { exists, moves: [{ from: "/learn/dsa/01-arrays-lists", to: "/learn/dsa/05-arrays-deep" }] });
  assert.equal(moved.v2, "content/ar/tracks/dsa/05-arrays-deep.mdx");
  assert.equal(moved.moved, true);
  assert.equal(sourceFor("/learn/python", { exists }).v2, "content/ar/tracks/python/_meta.json");
  assert.equal(sourceFor("/reference/dsa/linear-search", { exists }).v2, "content/ar/reference/dsa.json");
  assert.equal(sourceFor("/", { exists }), null);
  assert.equal(sourceFor("/about", { exists }), null);
  assert.equal(sourceFor("/jobs/saudi-arabia", { exists }), null);
});

test("sourceFor survives a redirect cycle", () => {
  const moves = [{ from: "/learn/a/1", to: "/learn/a/2" }, { from: "/learn/a/2", to: "/learn/a/1" }];
  assert.ok(sourceFor("/learn/a/1", { exists: () => true, moves }));
});

test("proseWords ignores frontmatter and code", () => {
  const mdx = "---\ntitle: x\n---\n\nمرحبا بالعالم `inline code`\n\n```js\nconst a = 1;\n```\n\n[رابط](/learn/x) two words";
  assert.equal(proseWords(mdx), 5);
});

test("sha256 is over the exact UTF-8 text", () => {
  assert.equal(sha256("{}\n"), "ca3d163bab055381827226140568f3bef7eaac187cebd76878e0b63e9e442356");
});

import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

// The blog sitemap entry must advertise the same modification date as the
// post's JSON-LD dateModified: `updated` when a post was really rewritten,
// otherwise its publish `date`. Before 2026-10-19 it always used `date`,
// so 20+ rewritten posts kept telling Google they had not changed.
const SITEMAP_SRC = fs.readFileSync(path.join(process.cwd(), "apps/web/src/app/sitemap.ts"), "utf-8");
const POST_PAGE_SRC = fs.readFileSync(
  path.join(process.cwd(), "apps/web/src/app/blog/[slug]/page.tsx"),
  "utf-8"
);

test("blog sitemap lastModified prefers updated over date", () => {
  assert.ok(SITEMAP_SRC.includes("lastModified: new Date(p.updated ?? p.date)"));
  assert.ok(!SITEMAP_SRC.includes("lastModified: new Date(p.date)"));
});

test("sitemap and JSON-LD dateModified use the same rule", () => {
  assert.ok(POST_PAGE_SRC.includes("dateModified: post.updated ?? post.date"));
});

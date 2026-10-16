import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

const PRICING_PAGE_SRC = fs.readFileSync(
  path.join(process.cwd(), "apps", "web", "src", "app", "pricing", "page.tsx"),
  "utf-8"
);

test("pricing CTAs always provide a real destination or an explicit unavailable state", () => {
  assert.ok(PRICING_PAGE_SRC.includes('href: "/learn"'));
  assert.ok(PRICING_PAGE_SRC.includes('href: "/contact"'));
  assert.ok(PRICING_PAGE_SRC.includes('t.kind === "pro" ? paymentsEnabled'));
  assert.ok(PRICING_PAGE_SRC.includes("الاشتراك قريبًا"));
  assert.ok(!PRICING_PAGE_SRC.includes('<button className="btn-neon w-full'));
});

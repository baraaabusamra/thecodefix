// Single entry point for every content/SEO/data integrity check:
// `npm run check:all`. Used by `npm run ci`, run-ci.cmd and GitHub Actions.
//
// BLOCKING checks fail the run. INFORMATIONAL checks print their report but
// never fail it (they need human judgement — see docs/seo-technical-policy.md).

import { spawnSync } from "node:child_process";
import fs from "node:fs";

const BLOCKING = [
  "check:links",
  "check:summary-order",
  "check:frontmatter",
  "check:blog-ref",
  "check:redundant-h1",
  "check:ref-related",
  "check:quizzes",
  "check:quiz-bank",
  "check:roadmaps",
  "check:academic",
  "check:academic-courses",
  "check:orphan-blog",
  "check:migrations",
];
const INFORMATIONAL = ["check:ref-keywords"];

// Each check:* script is `node scripts/<file>`; run it directly with this Node
// binary (cross-platform, no shell).
const pkgScripts = JSON.parse(fs.readFileSync("package.json", "utf8")).scripts;
const failures = [];

for (const script of [...BLOCKING, ...INFORMATIONAL]) {
  console.log(`\n=== ${script} ===`);
  const command = pkgScripts[script];
  const match = /^node (\S+)((?: \S+)*)$/.exec(command ?? "");
  if (!match) {
    failures.push(`${script} (not a plain "node <file>" script: ${command})`);
    continue;
  }
  const args = [match[1], ...match[2].split(" ").filter(Boolean)];
  const r = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (r.status !== 0) {
    if (INFORMATIONAL.includes(script)) console.log(`(informational: ${script} exited ${r.status})`);
    else failures.push(script);
  }
}

if (failures.length) {
  console.error(`\nFailed checks: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("\nAll blocking checks passed.");

#!/usr/bin/env node
// scripts/audit/run-all.mjs
// 📍 خريطة: منطقة "أدوات الفحص" ← المشغّل الرئيسي
// One command for the whole audit:
//   node scripts/audit/run-all.mjs              → scan current checkout + rebuild map
//   node scripts/audit/run-all.mjs --branches   → also sweep every unmerged branch
//   node scripts/audit/run-all.mjs --fast       → skip tsc/eslint/npm audit (content-only edits)
// Output: audit-out/main/*.json, audit-out/branches/**, audit-out/map.json,
//         docs/project-map/MAP.md, docs/project-map/map-data.js

import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const fast = process.argv.includes("--fast");
const run = (script, args = []) => {
  const t = Date.now();
  const r = spawnSync(process.execPath, [path.join("scripts/audit", script), ...args], { cwd: root, stdio: "inherit" });
  console.log(`   ${script} done in ${Math.round((Date.now() - t) / 1000)}s`);
  if (r.status !== 0) process.exitCode = 1;
};

run("scan-code.mjs", ["--out", "audit-out/main/code.json", ...(fast ? ["--skip-ts"] : [])]);
run("scan-security.mjs", ["--out", "audit-out/main/security.json", ...(fast ? ["--no-npm-audit"] : [])]);
run("scan-content.mjs", ["--out", "audit-out/main/content.json", "--with-checks"]);
if (process.argv.includes("--branches")) run("scan-branches.mjs");
run("build-map.mjs");

run("export-page.mjs");

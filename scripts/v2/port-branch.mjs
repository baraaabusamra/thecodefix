#!/usr/bin/env node
// scripts/v2/port-branch.mjs
// 📍 خريطة: منطقة "مختبر الجودة" ← نقل فرع قديم (V1) إلى هيكل V2
//
// V1 branches (content refreshes, fixes) touch paths that moved in V2
// (src/content/tracks/… → content/ar/tracks/…, src/lib/x.ts → modules/…).
// This tool replays such a branch on top of V2:
//   1. takes the branch's own changes (merge-base → tip) as a patch,
//   2. rewrites every path in the patch with scripts/v2/layout.mjs,
//   3. applies it on a new branch `v2/<branch>` cut from the current HEAD
//      (3-way, so small drifts still apply),
//   4. rewrites V1-style "@/lib/…", "@/components/…", "@/db…" imports in the
//      changed code files to their V2 specifiers.
// Nothing is pushed unless --push is given.
//
//   node scripts/v2/port-branch.mjs content/css-refresh-2026-09-14
//   node scripts/v2/port-branch.mjs content/css-refresh-2026-09-14 --base origin/main --push

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { mapPath, packageOf, PACKAGES } from "./layout.mjs";

const argv = process.argv.slice(2);
const branch = argv.find((a) => !a.startsWith("--"));
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
if (!branch) {
  console.error("usage: port-branch.mjs <v1-branch> [--base origin/main] [--push]");
  process.exit(1);
}
const git = (...a) => execFileSync("git", a, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 }).trim();
const v1Base = opt("--base", "origin/main");
const ref = git("rev-parse", "--verify", branch.startsWith("origin/") ? branch : `origin/${branch}`);
const mb = git("merge-base", v1Base, ref);
const patch = git("diff", "--binary", "--full-index", mb, ref) + "\n";
if (!patch.trim()) {
  console.log("nothing to port: the branch has no changes of its own");
  process.exit(0);
}

// ---- 1. re-path the patch (generated files are regenerated, not merged)
const GENERATED = new Set(["src/content/lesson-dates.json", "content/data/lesson-dates.json"]);
const sections = patch.split(/(?=^diff --git )/m);
const skipped = sections.filter((sec) => [...GENERATED].some((g) => sec.startsWith(`diff --git a/${g} `)));
const kept = sections.filter((sec) => !skipped.includes(sec)).join("");
const changed = new Set();
const rewritten = kept.replace(/^(diff --git a\/)(\S+)( b\/)(\S+)$|^(--- a\/|\+\+\+ b\/|rename from |rename to |copy from |copy to )(\S+)$/gm, (line, d1, a, d2, b, pfx, p) => {
  if (d1) {
    changed.add(mapPath(b));
    return `${d1}${mapPath(a)}${d2}${mapPath(b)}`;
  }
  return `${pfx}${mapPath(p)}`;
});
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "port-")), "v2.patch");
fs.writeFileSync(tmp, rewritten);

// ---- 2. apply on a fresh branch
const target = `v2/${branch.replace(/^origin\//, "")}`;
git("switch", "-c", target);
const applied = spawnSync("git", ["apply", "--3way", "--whitespace=nowarn", tmp], { encoding: "utf8" });
if (applied.status !== 0) {
  console.error(applied.stderr);
  console.error(`\nconflicts while applying on ${target}. Resolve them (git status), commit, then re-run the checks.`);
  process.exit(2);
}

// ---- 3. V1 "@/…" specifiers inside changed code → V2
const v1Files = new Set(git("ls-tree", "-r", "--name-only", mb).split("\n"));
const EXT = ["", ".ts", ".tsx", "/index.ts", "/index.tsx", ".json"];
let fixed = 0;
for (const f of changed) {
  if (!/\.(ts|tsx|mjs)$/.test(f) || !fs.existsSync(f)) continue;
  const src = fs.readFileSync(f, "utf8");
  const out = src.replace(/(from\s+|import\(\s*|mock\.module\(\s*)(["'])(@\/[^"']+)\2/g, (m, pre, q, spec) => {
    const v2Here = EXT.some((e) => fs.existsSync("apps/web/src/" + spec.slice(2) + e));
    if (v2Here && packageOf(f) === "@tcf/web") return m;
    const v1 = EXT.map((e) => "src/" + spec.slice(2) + e).find((p) => v1Files.has(p));
    if (!v1) return m;
    const v2 = mapPath(v1);
    const pkg = packageOf(v2);
    let ns;
    if (pkg === "@tcf/web") ns = "@/" + path.posix.relative("apps/web/src", v2).replace(/\.(ts|tsx)$/, "");
    else if (pkg && pkg === packageOf(f)) ns = path.posix.relative(path.posix.dirname(f), v2).replace(/\.(ts|tsx)$/, "").replace(/^(?!\.)/, "./");
    else if (pkg) ns = `${pkg}/${path.posix.relative(PACKAGES[pkg].dir + "/src", v2).replace(/\.(ts|tsx)$/, "")}`.replace(/\/index$/, "");
    else return m;
    fixed++;
    return `${pre}${q}${ns}${q}`;
  });
  if (out !== src) fs.writeFileSync(f, out);
}

if (skipped.length) {
  console.log("regenerating content/data/lesson-dates.json (generated file, not merged)…");
  spawnSync(process.execPath, ["scripts/generate-lesson-dates.mjs"], { stdio: "inherit" });
}
git("add", "-A");
git("commit", "-q", "-m", `port(v2): ${branch} onto the V2 layout\n\nReplayed with scripts/v2/port-branch.mjs (paths re-mapped by scripts/v2/layout.mjs; ${fixed} V1 imports rewritten).`);
console.log(`ported ${changed.size} file(s) onto ${target}${fixed ? `, rewrote ${fixed} V1 import(s)` : ""}.`);
console.log("next: npm run typecheck && npm test && npm run check:all");
if (argv.includes("--push")) git("push", "-u", "origin", target);

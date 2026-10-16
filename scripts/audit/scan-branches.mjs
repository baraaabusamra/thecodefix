#!/usr/bin/env node
// scripts/audit/scan-branches.mjs
// 📍 خريطة: منطقة "أدوات الفحص" ← فاحص الفروع
// Runs scan-code, scan-security and scan-content on every branch that has
// commits not in main — but only on the files that branch changed, so a
// 54-branch sweep costs minutes, not hours (and zero model tokens).
//
// For each branch:
//   1. classify:  in-main | unique-applies | unique-conflicts | unrelated
//   2. git worktree at <tmp>/wt-<branch>, node_modules symlinked from root
//   3. scanners with --files <changed files>; tsc/eslint only if .ts/.tsx changed;
//      npm audit only if package*.json changed; check:all always (2s)
//   4. audit-out/branches/<branch>/{code,security,content}.json + summary.json
//
// Usage: node scripts/audit/scan-branches.mjs [--only name1,name2] [--base main]
// Needs: git remote "origin" reachable. Uses only git (no GitHub API).

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const root = process.cwd();
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const base = opt("--base", "main");
const only = opt("--only", null)?.split(",");
const outRoot = path.join(root, "audit-out/branches");
const tmp = fs.mkdtempSync(path.join(process.env.AUDIT_TMP || os.tmpdir(), "branch-scan-"));
const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }).trim();
const tryGit = (...a) => {
  try {
    return git(...a);
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------- discover
const heads = git("ls-remote", "--heads", "origin")
  .split("\n")
  .map((l) => l.split("refs/heads/")[1])
  .filter((b) => b && b !== base && (!only || only.includes(b)));
console.log(`fetching ${heads.length} branches…`);
git("fetch", "-q", "--depth=60", "origin", `+refs/heads/${base}:refs/remotes/origin/${base}`, ...heads.map((b) => `+refs/heads/${b}:refs/remotes/origin/${b}`));

const summary = [];
for (const b of heads) {
  const ref = `origin/${b}`;
  const mb = tryGit("merge-base", `origin/${base}`, ref);
  if (!mb) {
    summary.push({ branch: b, status: "unrelated", note: "تاريخ منفصل عن main (أو أعمق من 60 commit) — ما انفحص." });
    continue;
  }
  const ahead = +git("rev-list", "--count", `${mb}..${ref}`);
  const behind = +git("rev-list", "--count", `${mb}..origin/${base}`);
  if (ahead === 0) {
    summary.push({ branch: b, status: "merged", ahead, behind });
    continue;
  }
  const changed = git("diff", "--name-only", "--diff-filter=ACMR", mb, ref).split("\n").filter(Boolean);
  const patch = path.join(tmp, "p.diff");
  fs.writeFileSync(patch, git("diff", "--binary", mb, ref) + "\n");
  const wtMain = path.join(tmp, "wt-base");
  if (!fs.existsSync(wtMain)) git("worktree", "add", "-q", "--detach", wtMain, `origin/${base}`);
  const applies = (rev) => spawnSync("git", ["apply", "--check", ...(rev ? ["-R"] : []), patch], { cwd: wtMain }).status === 0;
  const status = applies(true) ? "in-main" : applies(false) ? "unique-applies" : "unique-conflicts";
  const last = git("log", "-1", "--format=%cs", ref);
  const entry = { branch: b, status, ahead, behind, changedFiles: changed.length, lastCommit: last, subject: git("log", "-1", "--format=%s", ref) };
  summary.push(entry);
  if (status === "in-main") continue;

  // ------------------------------------------------------------ scan
  const wt = path.join(tmp, "wt-" + b.replace(/[^\w.-]/g, "_"));
  git("worktree", "add", "-q", "--detach", wt, ref);
  fs.symlinkSync(path.join(root, "node_modules"), path.join(wt, "node_modules"), "dir");
  // Judge every branch by main's CURRENT CI rules: older branches predate
  // scripts/run-checks.mjs and newer check:* scripts. Copy the missing ones in
  // (never overwrite a script the branch itself changed) and use main's list.
  for (const s of fs.readdirSync(path.join(root, "scripts"))) {
    const dst = path.join(wt, "scripts", s);
    if (s.endsWith(".mjs") && !fs.existsSync(dst)) fs.copyFileSync(path.join(root, "scripts", s), dst);
  }
  const wtPkg = JSON.parse(fs.readFileSync(path.join(wt, "package.json"), "utf8"));
  wtPkg.scripts = { ...wtPkg.scripts, ...JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).scripts };
  fs.writeFileSync(path.join(wt, "package.json"), JSON.stringify(wtPkg, null, 2));
  const list = path.join(tmp, "files.txt");
  fs.writeFileSync(list, changed.join("\n"));
  const out = path.join(outRoot, b);
  fs.mkdirSync(out, { recursive: true });
  const scanner = (name, extra = []) => {
    const r = spawnSync(process.execPath, [path.join(root, "scripts/audit", name), "--root", wt, "--files", list, "--branch", b, "--quiet", "--out", path.join(out, name.replace("scan-", "").replace(".mjs", ".json")), ...extra], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) console.error(`  ${name} failed on ${b}:`, (r.stderr || "").slice(0, 300));
  };
  const tsChanged = changed.some((f) => /\.(ts|tsx)$/.test(f) && !/^(src\/)?content\//.test(f));
  const pkgChanged = changed.some((f) => /package(-lock)?\.json$/.test(f));
  scanner("scan-code.mjs", tsChanged ? [] : ["--skip-ts"]);
  scanner("scan-security.mjs", pkgChanged ? [] : ["--no-npm-audit"]);
  scanner("scan-content.mjs", ["--with-checks"]);

  // Dependency advisories the branch merely inherits from main are main's problem, not the branch's.
  const mainSec = path.join(root, "audit-out/main/security.json");
  const brSec = path.join(out, "security.json");
  if (fs.existsSync(mainSec) && fs.existsSync(brSec)) {
    const known = new Set(JSON.parse(fs.readFileSync(mainSec, "utf8")).findings.filter((x) => x.rule === "SEC-DEPENDENCY").map((x) => x.message.split(" (")[0]));
    const j = JSON.parse(fs.readFileSync(brSec, "utf8"));
    j.findings = j.findings.filter((x) => x.rule !== "SEC-DEPENDENCY" || !known.has(x.message.split(" (")[0]));
    j.totals.all = j.findings.length;
    for (const k of ["critical", "high", "medium", "low", "info"]) j.totals[k] = j.findings.filter((x) => x.severity === k).length;
    fs.writeFileSync(brSec, JSON.stringify(j, null, 1));
  }
  // check:all runs over the whole tree. On a branch that is behind main it also
  // reports old problems in files the branch never touched (already fixed on
  // main). Keep only failures in changed files; summarise the rest as staleness.
  const brCnt = path.join(out, "content.json");
  if (fs.existsSync(brCnt)) {
    const j = JSON.parse(fs.readFileSync(brCnt, "utf8"));
    const changedSet = new Set(changed);
    const stale = j.findings.filter((x) => x.rule === "CNT-CHECK" && !changedSet.has(x.file));
    j.findings = j.findings.filter((x) => !stale.includes(x));
    if (stale.length)
      j.findings.push({ scanner: "content", category: "project-check", severity: "info", file: changed[0], line: 1, rule: "CNT-STALE", message: `الفرع متأخر ${behind} commit عن main: ${stale.length} فشل بفحوصات CI بملفات ما لمسها الفرع (غالباً انصلحت بـ main).`, hint: "اعمل rebase على main وأعد الفحص قبل الحكم على الفرع.", confidence: "confirmed", branch: b });
    j.totals.all = j.findings.length;
    for (const k of ["critical", "high", "medium", "low", "info"]) j.totals[k] = j.findings.filter((x) => x.severity === k).length;
    fs.writeFileSync(brCnt, JSON.stringify(j, null, 1));
  }
  const totals = {};
  for (const k of ["code", "security", "content"]) {
    const p = path.join(out, k + ".json");
    if (fs.existsSync(p)) totals[k] = JSON.parse(fs.readFileSync(p, "utf8")).totals;
  }
  entry.totals = totals;
  console.log(`  ${b.padEnd(48)} ${status.padEnd(17)} files=${changed.length}`, Object.entries(totals).map(([k, t]) => `${k}:${t.all}`).join(" "));
  git("worktree", "remove", "--force", wt);
}
tryGit("worktree", "remove", "--force", path.join(tmp, "wt-base"));
fs.mkdirSync(outRoot, { recursive: true });
fs.writeFileSync(path.join(outRoot, "summary.json"), JSON.stringify({ base, generatedAt: new Date().toISOString(), branches: summary }, null, 1));
const counts = summary.reduce((a, s) => ((a[s.status] = (a[s.status] || 0) + 1), a), {});
console.log("branches:", counts, "→", path.join(outRoot, "summary.json"));

// scripts/audit/lib.mjs
// 📍 خريطة: منطقة "أدوات الفحص" ← مكتبة مشتركة لكل سكربتات audit
// Shared helpers for the audit scanners (scan-code, scan-security,
// scan-content, scan-branches, build-map). Every scanner emits findings
// in ONE shape so the map can place them on the right file and line.
//
// Finding = {
//   scanner: "code" | "security" | "content",
//   category: string,          // e.g. "typescript", "secret", "spelling"
//   severity: "critical" | "high" | "medium" | "low" | "info",
//   file: string,              // repo-relative, forward slashes
//   line?: number,
//   rule: string,              // stable id, e.g. "SEC-AUTH-MISSING"
//   message: string,           // Arabic, one sentence
//   hint?: string,             // how to fix / what to verify
//   confidence: "confirmed" | "likely" | "verify",
//   branch?: string
// }

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const SEVERITIES = ["critical", "high", "medium", "low", "info"];

export function parseArgs(argv = process.argv.slice(2)) {
  const args = { root: process.cwd(), out: null, files: null, branch: null, quiet: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--root") args.root = path.resolve(argv[++i]);
    else if (a === "--out") args.out = path.resolve(argv[++i]);
    else if (a === "--files") args.files = readList(argv[++i]);
    else if (a === "--branch") args.branch = argv[++i];
    else if (a === "--quiet") args.quiet = true;
  }
  return args;
}

function readList(p) {
  return fs
    .readFileSync(p, "utf8")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** All git-tracked files under root (repo-relative). */
export function trackedFiles(root) {
  const out = execFileSync("git", ["ls-files", "-z"], { cwd: root, maxBuffer: 256 * 1024 * 1024 });
  return out.toString("utf8").split("\0").filter(Boolean);
}

/** Files to scan: explicit --files list (filtered to existing) or all tracked. */
export function targetFiles(args, filter = () => true) {
  const all = args.files ?? trackedFiles(args.root);
  return all.filter((f) => filter(f) && fs.existsSync(path.join(args.root, f)));
}

export function read(root, rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

export function lineOf(text, index) {
  let n = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

export function rel(root, abs) {
  return path.relative(root, abs).split(path.sep).join("/");
}

export class Findings {
  constructor(scanner, branch) {
    this.scanner = scanner;
    this.branch = branch ?? undefined;
    this.items = [];
    this.meta = {};
  }
  add(f) {
    this.items.push({ scanner: this.scanner, confidence: "likely", ...f, branch: this.branch });
  }
  write(out, quiet = false) {
    const bySev = Object.fromEntries(SEVERITIES.map((s) => [s, 0]));
    for (const f of this.items) bySev[f.severity]++;
    const payload = {
      scanner: this.scanner,
      branch: this.branch ?? null,
      generatedAt: new Date().toISOString(),
      totals: { all: this.items.length, ...bySev },
      meta: this.meta,
      findings: this.items,
    };
    if (out) {
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, JSON.stringify(payload, null, 1));
    }
    if (!quiet) {
      const cats = {};
      for (const f of this.items) cats[f.category] = (cats[f.category] || 0) + 1;
      console.log(`[${this.scanner}] ${this.items.length} findings`, bySev);
      console.log("  by category:", cats);
      if (out) console.log("  →", out);
    }
    return payload;
  }
}

/** Strip fenced code blocks and inline code, keeping line count stable. */
export function proseOnly(md) {
  let s = md.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1\s*$/gm, (m) => m.replace(/[^\n]/g, " "));
  s = s.replace(/`[^`\n]*`/g, (m) => " ".repeat(m.length));
  s = s.replace(/\]\([^)]*\)/g, (m) => " ".repeat(m.length)); // link targets
  s = s.replace(/<[^>\n]+>/g, (m) => " ".repeat(m.length)); // inline JSX/HTML tags
  return s;
}

/** Split "---\nfrontmatter\n---\nbody" and return body start line. */
export function splitFrontmatter(text) {
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!m) return { fm: null, body: text, bodyLine: 1 };
  return { fm: m[1], body: text.slice(m[0].length), bodyLine: lineOf(text, m[0].length) };
}

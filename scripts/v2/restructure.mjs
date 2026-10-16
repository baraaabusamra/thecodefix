#!/usr/bin/env node
// scripts/v2/restructure.mjs
// 📍 خريطة: منطقة "مختبر الجودة" ← سكربت الانتقال لمرة واحدة من V1 إلى V2
//
// One-time, deterministic move of the V1 tree into the V2 monorepo layout
// described by scripts/v2/layout.mjs. Kept in the repo so the move is
// reviewable and reproducible (and so old branches can be re-pathed with the
// same rules — see port-branch.mjs).
//
// What it does, in order:
//   1. reads every specifier in every code file using the TypeScript parser
//      (imports, exports, import(), require(), mock.module(), new URL(...))
//      and resolves it against the V1 tree;
//   2. `git mv`s every file to its V2 location;
//   3. rewrites each specifier for its new location:
//        same package        → relative path
//        another package     → "@tcf/<pkg>/<subpath>"
//        apps/web → apps/web → "@/..."
//        root scripts/tests  → relative path (or "@tcf/..." where the V1 code used "@/")
//   4. rewrites repo paths held in string literals and in path.join(...) runs
//      (scripts and tests read content and source files from disk);
//   5. prints every spot it could not rewrite safely, for a manual pass.
//
// Template literals are never touched (SQL lives there), and content files
// (MDX/JSON lessons) are never rewritten — only code.
//
//   node scripts/v2/restructure.mjs --dry   # report only
//   node scripts/v2/restructure.mjs         # perform

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mapPath, packageOf, PACKAGES, RULES } from "./layout.mjs";

const root = process.cwd();
const ts = createRequire(path.join(root, "package.json"))("typescript");
const DRY = process.argv.includes("--dry");
const posix = path.posix;

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const trackedSet = new Set(tracked);
const oldDirs = new Set();
for (const f of tracked) {
  let d = posix.dirname(f);
  while (d !== "." && !oldDirs.has(d)) {
    oldDirs.add(d);
    d = posix.dirname(d);
  }
}

const CODE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const SKIP = /^(src\/content\/|content\/|node_modules\/|archive\/|\.claude\/skills\/(vercel-|turborepo|next-dev-loop))/;
// Tooling whose string literals are patterns, not paths (updated by hand for V2).
const NO_STRING_REWRITE = /^scripts\/(audit|v2)\//;
const codeFiles = tracked.filter((f) => CODE.test(f) && !SKIP.test(f));

// ---------------------------------------------------------------- resolution (V1)
const EXT = ["", ".ts", ".tsx", ".mts", ".js", ".jsx", ".mjs", ".cjs", ".json", "/index.ts", "/index.tsx", "/index.js"];
function resolveOld(fromFile, spec) {
  let base;
  if (spec.startsWith("@/")) base = "src/" + spec.slice(2);
  else if (spec.startsWith("./") || spec.startsWith("../")) base = posix.normalize(posix.join(posix.dirname(fromFile), spec));
  else return null;
  const candidates = [base];
  // "./x.js" written for a TypeScript source (ESM-style specifier)
  if (/\.(js|mjs)$/.test(base)) candidates.push(base.replace(/\.m?js$/, ""));
  for (const b of candidates) for (const e of EXT) if (trackedSet.has(b + e)) return b + e;
  return null;
}

/** Map a V1 directory to V2 when every file beneath it keeps its relative layout. */
function mapDir(d) {
  d = d.replace(/\/$/, "");
  for (const [from, to] of RULES) {
    if (from.endsWith("/") && (d + "/").startsWith(from)) return (to + (d + "/").slice(from.length)).replace(/\/$/, "");
  }
  const under = tracked.filter((f) => f.startsWith(d + "/"));
  if (!under.length) return null;
  const first = mapPath(under[0]);
  const rest = under[0].slice(d.length);
  if (!first.endsWith(rest)) return null;
  const nd = first.slice(0, first.length - rest.length);
  return under.every((f) => mapPath(f) === nd + f.slice(d.length)) ? nd : null;
}

function mapAny(p) {
  if (trackedSet.has(p)) return mapPath(p);
  if (oldDirs.has(p.replace(/\/$/, ""))) {
    const m = mapDir(p);
    return m === null ? null : m + (p.endsWith("/") ? "/" : "");
  }
  return undefined; // not a repo path
}

// ---------------------------------------------------------------- specifier output (V2)
function pkgSubpath(pkg, file) {
  const dir = PACKAGES[pkg].dir;
  const inSrc = posix.relative(dir + "/src", file);
  if (inSrc === "index.ts") return pkg;
  return pkg + "/" + inSrc.replace(/\.(ts|tsx)$/, "");
}

function relSpec(fromFile, toFile, keepExt) {
  let r = posix.relative(posix.dirname(fromFile), toFile);
  if (!r.startsWith(".")) r = "./" + r;
  if (keepExt === "none") r = r.replace(/\.(ts|tsx|js|mjs)$/, "").replace(/\/index$/, "");
  else if (keepExt === "js") r = r.replace(/\.(ts|tsx)$/, ".js");
  return r;
}

const SPECIAL = {
  "src/content/lesson-dates.json": "@tcf/content/lesson-dates",
};

function newSpecifier(oldImporter, origSpec, oldTarget) {
  const newImporter = mapPath(oldImporter);
  const newTarget = mapPath(oldTarget);
  if (SPECIAL[oldTarget]) return SPECIAL[oldTarget];
  const ip = packageOf(newImporter);
  const tp = packageOf(newTarget);
  const ext = /\.(ts|tsx)$/.test(origSpec) ? "keep" : /\.m?js$/.test(origSpec) ? "js" : "none";
  if (ip && ip === tp) {
    if (ip === "@tcf/web" && origSpec.startsWith("@/")) return "@/" + posix.relative("apps/web/src", newTarget).replace(/\.(ts|tsx)$/, "");
    return relSpec(newImporter, newTarget, ext);
  }
  if (tp === "@tcf/web") {
    if (ip === null) return origSpec.startsWith("@/") ? "@/" + posix.relative("apps/web/src", newTarget).replace(/\.(ts|tsx)$/, "") : relSpec(newImporter, newTarget, ext);
    problems.push(`${newImporter}: imports app code ${newTarget} (inversion)`);
    return "@/" + posix.relative("apps/web/src", newTarget).replace(/\.(ts|tsx)$/, "");
  }
  if (tp) {
    if (ip === null && !origSpec.startsWith("@/")) return relSpec(newImporter, newTarget, ext);
    return pkgSubpath(tp, newTarget);
  }
  return relSpec(newImporter, newTarget, ext);
}

// ---------------------------------------------------------------- scan + plan edits (on V1 paths)
const problems = [];
const joinLits = new Set();
const edits = new Map(); // oldFile -> [{start,end,text}]
const addEdit = (f, start, end, text) => (edits.get(f) ?? edits.set(f, []).get(f)).push({ start, end, text });

function quoteLike(node, text, src) {
  const q = src[node.getStart()] === "'" ? "'" : '"';
  return q + text + q;
}

for (const f of codeFiles) {
  const src = fs.readFileSync(f, "utf8");
  const kind = /\.tsx$/.test(f) ? ts.ScriptKind.TSX : /\.(js|jsx|mjs|cjs)$/.test(f) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, kind);
  const specNodes = new Set();

  const visit = (node) => {
    // import/export declarations
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      specNodes.add(node.moduleSpecifier);
    }
    // import("x"), require("x"), mock.module("x"), jest/vi style mocks
    if (ts.isCallExpression(node) && node.arguments.length && ts.isStringLiteral(node.arguments[0])) {
      const e = node.expression;
      const name = e.kind === ts.SyntaxKind.ImportKeyword ? "import" : ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : "";
      if (["import", "require", "module", "mock", "doMock"].includes(name) && (name !== "module" || /mock/.test(e.getText()))) specNodes.add(node.arguments[0]);
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isTemplateExpression(node.arguments[0])) {
      const head = node.arguments[0].head;
      const pathPart = head.text.split("?")[0];
      const oldT = resolveOld(f, pathPart);
      if (oldT) {
        const ns = newSpecifier(f, pathPart, oldT);
        if (ns !== pathPart) addEdit(f, head.getStart() + 1, head.getStart() + 1 + pathPart.length, ns);
      }
    }
    if (ts.isImportTypeNode?.(node) && node.argument && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) {
      specNodes.add(node.argument.literal);
    }
    // path.join / join / path.resolve runs of string literals
    if (ts.isCallExpression(node) && /^(path\.)?(join|resolve)$/.test(node.expression.getText())) {
      handleJoin(f, node, src);
    }
    // new URL("../src/...", import.meta.url)
    if (ts.isNewExpression(node) && node.expression.getText() === "URL" && node.arguments?.length === 2 && ts.isStringLiteral(node.arguments[0]) && node.arguments[1].getText() === "import.meta.url") {
      specNodes.add(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  // specifiers
  for (const lit of specNodes) {
    // Tests bust the module cache with "?query" suffixes — map the path part only.
    const [spec, query] = lit.text.includes("?") ? [lit.text.slice(0, lit.text.indexOf("?")), lit.text.slice(lit.text.indexOf("?"))] : [lit.text, ""];
    const oldT = resolveOld(f, spec);
    if (!oldT) {
      if (spec.startsWith("@/")) problems.push(`${f}: unresolved ${spec}`);
      continue;
    }
    const ns = newSpecifier(f, spec, oldT);
    if (ns !== spec) addEdit(f, lit.getStart(), lit.getEnd(), quoteLike(lit, ns + query, src));
  }

  // other string literals that are repo paths (scripts/tests/config read files by path)
  const walkStrings = (node) => {
    if (ts.isStringLiteral(node) && !specNodes.has(node) && !joinLits.has(node)) {
      const t = node.text;
      // Only literals that are unmistakably paths: they contain a slash, or are
      // the bare migrations folder name. Bare words like "content" or "public"
      // are ordinary values far more often than paths.
      if (!NO_STRING_REWRITE.test(f) && (/^(\.\.?\/)?(src|drizzle|public|assets|content)\/./.test(t) || t === "drizzle" || /^(next\.config\.ts|drizzle\.config\.ts|postcss\.config\.mjs)$/.test(t))) {
        const rel = t.startsWith(".") ? posix.normalize(posix.join(posix.dirname(f), t)) : t;
        const m = mapAny(rel);
        if (m === null) problems.push(`${f}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}: path "${t}" spans several V2 locations — fix by hand`);
        else if (m !== undefined && m !== rel) {
          const out = t.startsWith(".") ? relSpec(mapPath(f), m, "keep") : m;
          addEdit(f, node.getStart(), node.getEnd(), quoteLike(node, out, src));
        }
      }
    }
    ts.forEachChild(node, walkStrings);
  };
  walkStrings(sf);
  joinLits.clear();
}

function handleJoin(f, call, src) {
  const args = call.arguments;
  let i = 0;
  if (args[0] && /process\.cwd\(\)|__dirname|ROOT|root/.test(args[0].getText()) && !ts.isStringLiteral(args[0])) i = 1;
  const lits = [];
  for (; i < args.length && ts.isStringLiteral(args[i]); i++) lits.push(args[i]);
  if (!lits.length) return;
  const segs = lits.map((l) => l.text);
  const joined = posix.normalize(segs.join("/"));
  if (NO_STRING_REWRITE.test(f) || !/^(src|drizzle|public|assets|content)(\/|$)/.test(joined)) return;
  for (const l of lits) joinLits.add(l);
  // longest prefix of the run that is a known path
  const m = mapAny(joined);
  if (m === undefined) {
    // dir that doesn't exist yet (e.g. src/content/jobs) — map by rules if possible
    const guess = mapPath(joined + "/__x__");
    if (guess !== joined + "/__x__") return replaceRun(f, lits, guess.replace(/\/__x__$/, ""), src);
    return;
  }
  if (m === null) {
    problems.push(`${f}:${call.getSourceFile().getLineAndCharacterOfPosition(call.getStart()).line + 1}: path.join(${segs.join(", ")}) spans several V2 locations — fix by hand`);
    return;
  }
  if (m !== joined) replaceRun(f, lits, m, src);
}
function replaceRun(f, lits, newPath, src) {
  const q = src[lits[0].getStart()] === "'" ? "'" : '"';
  const text = newPath.replace(/\/$/, "").split("/").map((s) => q + s + q).join(", ");
  addEdit(f, lits[0].getStart(), lits.at(-1).getEnd(), text);
}

// ---------------------------------------------------------------- report
console.log(`code files scanned: ${codeFiles.length}`);
console.log(`files with edits:   ${edits.size} (${[...edits.values()].reduce((a, e) => a + e.length, 0)} edits)`);
console.log(`files to move:      ${tracked.filter((f) => mapPath(f) !== f).length}`);
if (problems.length) {
  console.log(`\nneeds a manual pass (${problems.length}):`);
  for (const p of [...new Set(problems)]) console.log("  - " + p);
}
if (process.argv.includes("--list")) {
  for (const [f, list] of edits) for (const e of list) console.log(`${f}: ${e.text}`);
}
if (DRY) process.exit(0);

// ---------------------------------------------------------------- apply: rewrite in place, then move
for (const [f, list] of edits) {
  let src = fs.readFileSync(f, "utf8");
  list.sort((a, b) => b.start - a.start);
  let last = Infinity;
  for (const e of list) {
    if (e.end > last) continue; // overlapping (same literal seen twice)
    src = src.slice(0, e.start) + e.text + src.slice(e.end);
    last = e.start;
  }
  fs.writeFileSync(f, src);
}
const moves = tracked.filter((f) => mapPath(f) !== f);
for (const f of moves) {
  const to = mapPath(f);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  execFileSync("git", ["mv", "-k", f, to]);
}
console.log(`\nmoved ${moves.length} files, rewrote ${edits.size} files.`);

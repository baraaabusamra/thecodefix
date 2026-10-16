#!/usr/bin/env node
// scripts/v2/mv.mjs
// 📍 خريطة: منطقة "مختبر الجودة" ← نقل ملف داخل V2 وتحديث كل من يستورده
//
// Moves files inside the V2 monorepo and rewrites every import that points
// at them (and every import inside them), using the same specifier rules as
// the initial restructure:
//   same package → relative · other package → "@tcf/<pkg>/<subpath>" · apps/web → "@/…"
//
//   node scripts/v2/mv.mjs <from> <to> [<from> <to> …]
//   node scripts/v2/mv.mjs --dry modules/a/src/x.ts modules/b/src/x.ts
//
// Afterwards also update scripts/v2/layout.mjs if the file came from V1, so
// old branches still port to the right place.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { PACKAGES, packageOf } from "./layout.mjs";

const root = process.cwd();
const ts = createRequire(path.join(root, "package.json"))("typescript");
const posix = path.posix;
const args = process.argv.slice(2).filter((a) => a !== "--dry");
const DRY = process.argv.includes("--dry");
if (!args.length || args.length % 2) {
  console.error("usage: mv.mjs <from> <to> [<from> <to> …]");
  process.exit(1);
}
const moves = new Map();
for (let i = 0; i < args.length; i += 2) moves.set(posix.normalize(args[i]), posix.normalize(args[i + 1]));

const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const files = new Set(tracked);
for (const f of moves.keys()) if (!files.has(f)) throw new Error(`not tracked: ${f}`);
const after = (p) => moves.get(p) ?? p;

const EXT = ["", ".ts", ".tsx", ".mts", ".js", ".mjs", ".json", "/index.ts", "/index.tsx"];
function resolve(fromFile, spec) {
  let base;
  if (spec.startsWith("@/")) base = "apps/web/src/" + spec.slice(2);
  else if (spec.startsWith("@tcf/")) {
    const [scope, name, ...rest] = spec.split("/");
    const info = PACKAGES[`${scope}/${name}`];
    if (!info) return null;
    if (!rest.length) return files.has(`${info.dir}/src/index.ts`) ? `${info.dir}/src/index.ts` : null;
    const sub = rest.join("/");
    for (const c of [`${info.dir}/src/${sub}.ts`, `${info.dir}/src/${sub}.tsx`]) if (files.has(c)) return c;
    return null;
  } else if (spec.startsWith(".")) base = posix.normalize(posix.join(posix.dirname(fromFile), spec));
  else return null;
  const cands = [base];
  if (/\.m?js$/.test(base)) cands.push(base.replace(/\.m?js$/, ""));
  for (const b of cands) for (const e of EXT) if (files.has(b + e)) return b + e;
  return null;
}
function spec(fromFile, toFile, orig) {
  const ip = packageOf(fromFile), tp = packageOf(toFile);
  const ext = /\.(ts|tsx)$/.test(orig) ? "keep" : /\.m?js$/.test(orig) ? "js" : "none";
  const rel = () => {
    let r = posix.relative(posix.dirname(fromFile), toFile);
    if (!r.startsWith(".")) r = "./" + r;
    if (ext === "none") r = r.replace(/\.(ts|tsx|js|mjs)$/, "").replace(/\/index$/, "");
    if (ext === "js") r = r.replace(/\.(ts|tsx)$/, ".js");
    return r;
  };
  if (tp === "@tcf/web") return ip === "@tcf/web" || orig.startsWith("@/") ? "@/" + posix.relative("apps/web/src", toFile).replace(/\.(ts|tsx)$/, "") : rel();
  if (ip && ip === tp) return rel();
  if (tp && (ip || orig.startsWith("@tcf/"))) {
    const sub = posix.relative(`${PACKAGES[tp].dir}/src`, toFile);
    return sub === "index.ts" ? tp : `${tp}/${sub.replace(/\.(ts|tsx)$/, "")}`;
  }
  return rel();
}

const CODE = /\.(ts|tsx|mts|js|mjs|cjs)$/;
const SKIP = /^(content\/|node_modules\/|archive\/|\.claude\/skills\/)/;
let changed = 0;
for (const f of tracked.filter((x) => CODE.test(x) && !SKIP.test(x))) {
  const src = fs.readFileSync(f, "utf8");
  const sf = ts.createSourceFile(f, src, ts.ScriptTarget.Latest, true, f.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const lits = [];
  const visit = (n) => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) lits.push(n.moduleSpecifier);
    if (ts.isCallExpression(n) && n.arguments.length && ts.isStringLiteral(n.arguments[0])) {
      const t = n.expression.getText();
      if (n.expression.kind === ts.SyntaxKind.ImportKeyword || t === "require" || /mock\.module$|\.mock$/.test(t)) lits.push(n.arguments[0]);
    }
    if (ts.isNewExpression(n) && n.expression.getText() === "URL" && n.arguments?.length === 2 && ts.isStringLiteral(n.arguments[0])) lits.push(n.arguments[0]);
    ts.forEachChild(n, visit);
  };
  visit(sf);
  const edits = [];
  for (const lit of lits) {
    const target = resolve(f, lit.text);
    if (!target) continue;
    if (!moves.has(target) && !moves.has(f)) continue;
    const ns = spec(after(f), after(target), lit.text);
    if (ns !== lit.text) edits.push([lit.getStart() + 1, lit.getEnd() - 1, ns]);
  }
  // string literals holding the moved path (tests reading sources by path)
  const walk = (n) => {
    if (ts.isStringLiteral(n) && moves.has(n.text)) edits.push([n.getStart() + 1, n.getEnd() - 1, moves.get(n.text)]);
    ts.forEachChild(n, walk);
  };
  walk(sf);
  if (!edits.length) continue;
  let out = src;
  for (const [s, e, t] of edits.sort((a, b) => b[0] - a[0])) out = out.slice(0, s) + t + out.slice(e);
  changed++;
  if (DRY) console.log(`would edit ${f} (${edits.length})`);
  else fs.writeFileSync(f, out);
}
for (const [from, to] of moves) {
  if (DRY) console.log(`would move ${from} → ${to}`);
  else {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    execFileSync("git", ["mv", from, to]);
  }
}
console.log(`${DRY ? "would update" : "updated"} ${changed} files, ${moves.size} moved`);

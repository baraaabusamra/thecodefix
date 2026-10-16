#!/usr/bin/env node
// scripts/v2/refresh-doc-paths.mjs
// 📍 خريطة: منطقة "مختبر الجودة" ← تحديث مسارات V1 في التوثيق والتعليقات
//
// Rewrites V1 path mentions ("src/lib/content.ts", "src/content/tracks/",
// "drizzle/", …) to their V2 locations, using scripts/v2/layout.mjs:
//   - Markdown docs, agent instructions, Cursor rules, project skills
//   - comments inside TypeScript/JavaScript files (never code or strings)
// Historical V1 snapshots are left as written: docs/v1/**, docs/repository-audit/**,
// and docs/v2/** (it names V1 paths on purpose: "src/lib/x.ts moved to …").
// Third-party skills (.claude/skills/THIRD_PARTY.md) are vendored unchanged and skipped too.
//
//   node scripts/v2/refresh-doc-paths.mjs --dry
//   node scripts/v2/refresh-doc-paths.mjs

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mapPath, RULES } from "./layout.mjs";

const DRY = process.argv.includes("--dry");
const ts = createRequire(path.join(process.cwd(), "package.json"))("typescript");
const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);

const HISTORICAL = /^(docs\/v1\/|docs\/v2\/|docs\/repository-audit\/|content\/|docs\/project-map\/MAP\.md|archive\/|\.claude\/skills\/(vercel-|turborepo|next-dev-loop|v1-|seo-audit|ai-seo|programmatic-seo|schema\/|site-architecture|content-strategy|seo-hreflang|seo-plan))/;
const DOCS = tracked.filter((f) => /\.(md|mdc)$/.test(f) && !HISTORICAL.test(f));
const CODE = tracked.filter((f) => /\.(ts|tsx|mjs|js|cjs)$/.test(f) && !HISTORICAL.test(f) && !f.startsWith("scripts/v2/") && !f.startsWith("tests/fixtures/"));

const TOKEN = /(?<![\w./@-])((?:src\/(?:app|lib|components|content|db|types)(?:\/[\w\-.[\]*]+)*\/?|src\/(?:auth|instrumentation)\.ts|drizzle\/[\w\-.*/]*|drizzle\.config\.ts|next\.config\.ts|postcss\.config\.mjs|public\/[\w\-./]+))/g;

function mapToken(tok) {
  const glob = tok.indexOf("*");
  const head = glob >= 0 ? tok.slice(0, glob) : tok;
  const tail = glob >= 0 ? tok.slice(glob) : "";
  // exact file
  const asFile = head.replace(/\/$/, "");
  const f = mapPath(asFile);
  if (f !== asFile && !head.endsWith("/")) return f + tail;
  // directory: longest prefix rule
  const d = head.endsWith("/") ? head : head + "/";
  for (const [from, to] of RULES) {
    if (from.endsWith("/") && d.startsWith(from)) return (to + d.slice(from.length)).replace(/\/$/, head.endsWith("/") ? "/" : "") + tail;
  }
  // well-known V1 directories that split in V2
  const SPLIT = { "src/lib": "packages/* · modules/*", "src/components": "packages/ui · modules/*/src/ui · apps/web/src/shell", "src/content": "content/ar · content/data", "src/db": "packages/db/src", "src": "apps/web/src · packages/* · modules/*" };
  const key = head.replace(/\/$/, "");
  if (SPLIT[key] && !tail) return SPLIT[key];
  return null;
}

let files = 0, edits = 0;
const changeText = (text) =>
  text.replace(TOKEN, (m) => {
    // sentence punctuation is not part of the path ("…/actions.ts." → "…/actions.ts")
    const trail = m.match(/[.,;:]+$/)?.[0] ?? "";
    const tok = trail ? m.slice(0, -trail.length) : m;
    const n = mapToken(tok);
    if (!n || n === tok) return m;
    edits++;
    return n + trail;
  });

for (const f of DOCS) {
  const src = fs.readFileSync(f, "utf8");
  const out = changeText(src);
  if (out !== src) {
    files++;
    if (!DRY) fs.writeFileSync(f, out);
  }
}

for (const f of CODE) {
  const src = fs.readFileSync(f, "utf8");
  const scanner = ts.createScanner(ts.ScriptTarget.Latest, false, f.endsWith("x") ? ts.LanguageVariant.JSX : ts.LanguageVariant.Standard, src);
  const ranges = [];
  let k;
  while ((k = scanner.scan()) !== ts.SyntaxKind.EndOfFileToken) {
    if (k === ts.SyntaxKind.SingleLineCommentTrivia || k === ts.SyntaxKind.MultiLineCommentTrivia) ranges.push([scanner.getTokenPos(), scanner.getTextPos()]);
  }
  if (!ranges.length) continue;
  let out = "";
  let last = 0;
  for (const [s, e] of ranges) {
    out += src.slice(last, s) + changeText(src.slice(s, e));
    last = e;
  }
  out += src.slice(last);
  if (out !== src) {
    files++;
    if (!DRY) fs.writeFileSync(f, out);
  }
}
console.log(`${DRY ? "would update" : "updated"} ${files} files (${edits} path mentions)`);

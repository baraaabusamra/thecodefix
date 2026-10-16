#!/usr/bin/env node
// scripts/audit/scan-content.mjs
// 📍 خريطة: منطقة "أدوات الفحص" ← فاحص كتابة المحتوى
// Content-quality scanner for lessons, blog posts and reference entries.
// Complements (does not duplicate) the project's own `npm run check:all`,
// whose failures are folded in with --with-checks.
//
//   CNT-SPELLING        high-precision Arabic spelling slips (همزة وصل/قطع، هذة، الى…)
//   CNT-REPEAT          the same word twice in a row ("في في")
//   CNT-ENTITY          entity name not in its canonical form (docs/content-guidelines.md §38)
//   CNT-PLACEHOLDER     TODO / FIXME / lorem ipsum / TBD left in published prose
//   CNT-FENCE           unclosed ``` code fence
//   CNT-HEADING-JUMP    heading level skipped (## → ####)
//   CNT-HEADING-DUP     the same heading twice in one page
//   CNT-EMPTY-SECTION   a heading with nothing under it
//   CNT-IMG-ALT         image without alt text
//   CNT-THIN            very little prose (possible thin page — §19 says verify, not inflate)
//   CNT-DATE            `updated`/`date` in the future
//   CNT-DESC-LENGTH     meta description outside 50–160 chars (seo-technical-policy §2)
//   CNT-TITLE-DUP       two pages with the exact same title
//   CNT-CHECK           a failure reported by the project's own check:* scripts
//
// Usage: node scripts/audit/scan-content.mjs [--root DIR] [--files list.txt] [--out FILE] [--branch NAME] [--with-checks]

import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { parseArgs, targetFiles, read, Findings, proseOnly, splitFrontmatter, lineOf } from "./lib.mjs";

const args = parseArgs();
const root = args.root;
const req = createRequire(path.join(root, "package.json"));
const matter = req("gray-matter");
const F = new Findings("content", args.branch);
const today = new Date().toISOString().slice(0, 10);

const mdx = targetFiles(args, (f) => /^(src\/)?content\//.test(f) && !f.startsWith("content/_drafts/") && f.endsWith(".mdx"));
const refJson = targetFiles(args, (f) => /^(content\/[a-z]{2}|src\/content)\/reference\/.*\.json$/.test(f));

// ---------------------------------------------------------------- dictionaries
// Each entry: [regex on prose, correct form]. Only patterns that are almost never right.
const SPELLING = [
  [/(?<![؀-ۿ])الى(?![؀-ۿ])/g, "إلى"],
  [/(?<![؀-ۿ])هذة(?![؀-ۿ])/g, "هذه"],
  [/(?<![؀-ۿ])لاكن(?![؀-ۿ])/g, "لكن"],
  [/(?<![؀-ۿ])اللذي(?![؀-ۿ])/g, "الذي"],
  [/(?<![؀-ۿ])إن شاء(?![؀-ۿ])/g, null], // allow (placeholder to show format)
  // همزة وصل written as قطع (مصادر افتعال/استفعال)
  [/(?<![؀-ۿ])(?:و|ب|ل|ف|ال)?إ(?:ست(?!راتيج)|خت|عت|شت|رت|مت|لت|نتق|نتظ|نته|تص|تج|تف|جت|حت|ستث)[؀-ۿ]{2,}/g, "همزة وصل (ا) مش قطع (إ)"],
].filter(([, fix]) => fix !== null);

// canonical → variants that should not appear in prose
const ENTITIES = {
  JavaScript: [/\bJavascript\b/g, /\bJavaScipt\b/g, /\bJava Script\b/g],
  TypeScript: [/\bTypescript\b/g],
  "Node.js": [/\bNodeJS\b/g, /\bNodejs\b/g, /\bNodeJs\b/g, /\bNode\.JS\b/g],
  "Next.js": [/\bNextJS\b/g, /\bNextjs\b/g, /\bNextJs\b/g, /\bNext\.JS\b/g],
  GitHub: [/\bGithub\b/g],
  PostgreSQL: [/\bPostgresql\b/g, /\bPostgreSql\b/g, /\bPostgresSQL\b/g],
  MongoDB: [/\bMongodb\b/g, /\bMongoDb\b/g],
  MySQL: [/\bMySql\b/g, /\bMysql\b/g],
  "Vue.js": [/\bVueJS\b/g, /\bVuejs\b/g],
  Kubernetes: [/\bKubernates\b/g, /\bKubernetis\b/g],
  Docker: [/\bdocker\b(?=\s+[؀-ۿ])/g],
  Python: [/\bpython\b(?=\s+[؀-ۿ])/g],
  Django: [/\bDjango REST framework\b/g],
  "Tailwind CSS": [/\bTailwindCSS\b/g, /\bTailwindcss\b/g],
  "C#": [/\bC Sharp\b/g, /\bCsharp\b/g],
  "C++": [/\bCpp\b(?![-/])/g],
};

const PLACEHOLDER = /\b(?:TODO|FIXME|TBD|XXX|lorem ipsum)\b|\[\s*(?:هنا|ضع|أضف) [^\]]{0,30}\]/gi;

// ---------------------------------------------------------------- per-file
const titles = new Map();
for (const f of mdx) {
  const text = read(root, f);
  let fm = {};
  try {
    fm = matter(text).data;
  } catch {
    continue; // reported by scan-code
  }
  const { body, bodyLine } = splitFrontmatter(text);
  const prose = proseOnly(body);
  const at = (idx) => bodyLine - 1 + lineOf(body, idx);
  const kind = f.includes("/tracks/") ? "lesson" : f.includes("/blog/") ? "blog" : "other";

  // spelling
  for (const [re, fix] of SPELLING) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(prose))) {
      F.add({ category: "spelling", severity: "low", file: f, line: at(m.index), rule: "CNT-SPELLING", message: `«${m[0]}» ← الصحيح: ${fix}`, confidence: "likely" });
    }
  }
  // repeated word
  // Only function words: reduplication of nouns («كلمة كلمة», «واحدًا واحدًا») is intentional Arabic style.
  const rep = /(?<![؀-ۿ\w])(في|من|على|إلى|عن|مع|أن|إن|ما|لا|لم|لن|هو|هي|هذا|هذه|التي|الذي|ثم|أو|قد|كل|the|a|an|to|of|is|and|in|for|it)[ \t]{1,2}\1(?![؀-ۿ\w])/gi;
  let m;
  while ((m = rep.exec(prose))) {
    F.add({ category: "typo", severity: "low", file: f, line: at(m.index), rule: "CNT-REPEAT", message: `كلمة مكررة: «${m[0]}»`, confidence: "likely" });
  }
  // entities
  for (const [canon, variants] of Object.entries(ENTITIES)) {
    for (const re of variants) {
      re.lastIndex = 0;
      while ((m = re.exec(prose))) {
        F.add({ category: "entity", severity: "low", file: f, line: at(m.index), rule: "CNT-ENTITY", message: `«${m[0]}» ← الاسم الموحّد بالموقع: ${canon}`, hint: "content-guidelines.md §38: نفس الاسم بنفس الكتابة بكل الموقع.", confidence: "confirmed" });
      }
    }
  }
  // placeholders
  PLACEHOLDER.lastIndex = 0;
  while ((m = PLACEHOLDER.exec(prose))) {
    F.add({ category: "placeholder", severity: "medium", file: f, line: at(m.index), rule: "CNT-PLACEHOLDER", message: `نص مؤقت منسي بالمحتوى المنشور: «${m[0]}»`, confidence: "likely" });
  }
  // fences
  const fences = [...body.matchAll(/^\s*(```|~~~)/gm)];
  if (fences.length % 2 === 1) {
    F.add({ category: "structure", severity: "medium", file: f, line: at(fences.at(-1).index), rule: "CNT-FENCE", message: "بلوك كود مفتوح وما انسكّر (عدد ``` فردي).", confidence: "likely" });
  }
  // headings
  const heads = [...prose.matchAll(/^(#{1,6})[ \t]+(.+?)[ \t]*$/gm)];
  const seen = new Map();
  heads.forEach((h, i) => {
    const level = h[1].length;
    const txt = h[2].replace(/[*_`]/g, "").trim();
    const line = at(h.index);
    const prev = heads[i - 1];
    if (prev && level > prev[1].length + 1)
      F.add({ category: "structure", severity: "low", file: f, line, rule: "CNT-HEADING-JUMP", message: `قفزة بالعناوين من ${"#".repeat(prev[1].length)} إلى ${h[1]}.`, hint: "بتأثر على إمكانية الوصول وفهرس الصفحة.", confidence: "confirmed" });
    if (seen.has(txt) && level <= 3)
      F.add({ category: "structure", severity: "low", file: f, line, rule: "CNT-HEADING-DUP", message: `العنوان «${txt.slice(0, 40)}» مكرر بنفس الصفحة (أول مرة سطر ${seen.get(txt)}).`, confidence: "confirmed" });
    else seen.set(txt, line);
    const next = heads[i + 1];
    const between = body.slice(h.index + h[0].length, next ? next.index : body.length);
    if (next && next[1].length <= level && between.trim() === "")
      F.add({ category: "structure", severity: "low", file: f, line, rule: "CNT-EMPTY-SECTION", message: `القسم «${txt.slice(0, 40)}» فاضي.`, confidence: "confirmed" });
  });
  // images
  for (const im of body.matchAll(/!\[\s*\]\([^)]+\)|<img(?![^>]*\balt=)[^>]*>/g)) {
    F.add({ category: "accessibility", severity: "low", file: f, line: at(im.index), rule: "CNT-IMG-ALT", message: "صورة بدون نص بديل (alt).", confidence: "confirmed" });
  }
  // thin content (Arabic + English words in prose only)
  const words = (prose.match(/[؀-ۿ]{2,}|[A-Za-z]{2,}/g) || []).length;
  const isSummary = /summary|خلاصة|ملخص|quiz|project/i.test(f) || /خلاصة|ملخص/.test(fm.title || "");
  if (!isSummary && ((kind === "lesson" && words < 80) || (kind === "blog" && words < 200))) {
    F.add({ category: "depth", severity: "low", file: f, line: 1, rule: "CNT-THIN", message: `محتوى قصير (${words} كلمة شرح بدون الكود) — راجع إذا الصفحة بتغطي الموضوع.`, hint: "§19: الطول حسب الحاجة. إذا الموضوع صغير فعلاً، فكّر بدمجه مع صفحة أوسع (§7 اختبار 4).", confidence: "verify" });
  }
  // dates
  for (const k of ["updated", "date"]) {
    const v = fm[k] instanceof Date ? fm[k].toISOString().slice(0, 10) : typeof fm[k] === "string" ? fm[k].slice(0, 10) : null;
    if (v && v > today) {
      const i = text.indexOf(`${k}:`);
      F.add({ category: "metadata", severity: "medium", file: f, line: lineOf(text, i), rule: "CNT-DATE", message: `تاريخ ${k} (${v}) بالمستقبل.`, hint: "seo-technical-policy §13: صدق حقول الحداثة.", confidence: "confirmed" });
    }
  }
  // description length
  if (typeof fm.description === "string" && (fm.description.length < 50 || fm.description.length > 160) && kind !== "other") {
    const i = text.indexOf("description:");
    F.add({ category: "seo", severity: "info", file: f, line: lineOf(text, i), rule: "CNT-DESC-LENGTH", message: `الوصف ${fm.description.length} حرف (المثالي 50–160).`, confidence: "confirmed" });
  }
  // title registry
  if (fm.title) {
    const key = String(fm.title).trim();
    if (!titles.has(key)) titles.set(key, []);
    titles.get(key).push(f);
  }
}
const groupOf = (f) => (f.includes("/blog/") ? "blog" : path.dirname(f));
for (const [t, all] of titles) {
  const blogs = all.filter((f) => f.includes("/blog/"));
  const fs = all.filter((f, i) => all.findIndex((g) => groupOf(g) === groupOf(f)) !== i || (blogs.length && !f.includes("/blog/")));
  if (fs.length) {
    fs.unshift(all.find((f) => !fs.includes(f)) ?? all[0]);
    for (const f of fs.slice(1))
      F.add({ category: "duplication", severity: "medium", file: f, line: 2, rule: "CNT-TITLE-DUP", message: `نفس العنوان «${t.slice(0, 50)}» موجود كمان بـ ${fs[0]}.`, hint: "§8 تكرار النية: ادمج أو ميّز العنوان.", confidence: "confirmed" });
  }
}

// ---------------------------------------------------------------- reference JSON prose
for (const f of refJson) {
  const text = read(root, f);
  for (const [re, fix] of SPELLING) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text))) F.add({ category: "spelling", severity: "low", file: f, line: lineOf(text, m.index), rule: "CNT-SPELLING", message: `«${m[0]}» ← الصحيح: ${fix}`, confidence: "likely" });
  }
}

// ---------------------------------------------------------------- project checks
if (process.argv.includes("--with-checks")) {
  const r = spawnSync(process.execPath, ["scripts/run-checks.mjs"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = (r.stdout || "") + (r.stderr || "");
  F.meta.checksExit = r.status;
  if (r.status !== 0) {
    let section = "check";
    for (const ln of out.split("\n")) {
      const sec = ln.match(/^=== (check:[\w-]+) ===/);
      if (sec) {
        section = sec[1];
        continue;
      }
      const p = ln.match(/((?:src|scripts|drizzle)\/[\w./\[\]-]+\.(?:mdx|json|ts|tsx|sql))(?::(\d+))?/);
      if (p && !/^\s*(Total|All|Checked)/.test(ln)) {
        F.add({ category: "project-check", severity: "high", file: p[1], line: +(p[2] || 1), rule: "CNT-CHECK", message: `${section}: ${ln.trim().slice(0, 170)}`, hint: "هذا فحص من CI المشروع نفسه — بيوقف النشر.", confidence: "confirmed" });
      }
    }
    if (!F.items.some((x) => x.rule === "CNT-CHECK"))
      F.add({ category: "project-check", severity: "high", file: "scripts/run-checks.mjs", line: 1, rule: "CNT-CHECK", message: "فحوصات check:all فشلت: " + (out.split("\n").filter((l) => /FAIL|✗|failed|Error|issues: [1-9]|: [1-9]\d*$/i.test(l)).slice(0, 4).join(" | ") || out.trim().split("\n").slice(-3).join(" | ")).slice(0, 260), confidence: "confirmed" });
  }
}

F.meta.files = { mdx: mdx.length, reference: refJson.length };
F.write(args.out, args.quiet);

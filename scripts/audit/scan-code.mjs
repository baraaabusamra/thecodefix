#!/usr/bin/env node
// scripts/audit/scan-code.mjs
// 📍 خريطة: منطقة "أدوات الفحص" ← فاحص صيغة الكود
// Code-syntax scanner. Emits findings for:
//   1. TypeScript type errors        (tsc --noEmit)          — only on full runs or when .ts/.tsx targeted
//   2. ESLint errors/warnings        (eslint -f json)        — same
//   3. MDX that fails to compile     (@mdx-js/mdx + remark-gfm, same as the site's <Mdx>)
//   4. Frontmatter that fails YAML   (gray-matter)
//   5. Invalid JSON content files
//   6. Code snippets inside lessons whose syntax doesn't parse
//      (json / js / jsx / ts / tsx via TypeScript parser, python via `python3 -c ast.parse`)
//
// Usage: node scripts/audit/scan-code.mjs [--root DIR] [--files list.txt] [--out audit-out/code.json] [--branch NAME]
//        --skip-ts   skip tsc + eslint (fast content-only run)

import path from "node:path";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { parseArgs, targetFiles, read, Findings, splitFrontmatter, lineOf } from "./lib.mjs";

const args = parseArgs();
const skipTs = process.argv.includes("--skip-ts");
const root = args.root;
const req = createRequire(path.join(root, "package.json"));
const F = new Findings("code", args.branch);
const t0 = Date.now();

const files = targetFiles(args);
const tsFiles = files.filter((f) => /\.(ts|tsx|mjs|js)$/.test(f) && !/^(src\/)?content\//.test(f));
const mdxFiles = files.filter((f) => f.endsWith(".mdx"));
const jsonFiles = files.filter((f) => /^(src\/)?content\/.*\.json$/.test(f));

// ---------- 1. TypeScript ----------
if (!skipTs && (args.files === null || tsFiles.some((f) => /\.tsx?$/.test(f)))) {
  const r = spawnSync(path.join(root, "node_modules/.bin/tsc"), ["--noEmit", "--pretty", "false"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  const re = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/gm;
  let m, n = 0;
  while ((m = re.exec(r.stdout + r.stderr))) {
    n++;
    F.add({
      category: "typescript",
      severity: "high",
      file: m[1],
      line: +m[2],
      rule: m[4],
      message: `خطأ TypeScript: ${m[5]}`,
      hint: "صلّح النوع أو الاستيراد — هذا الخطأ بيوقف الـ build.",
      confidence: "confirmed",
    });
  }
  F.meta.tsc = { ran: true, errors: n };
}

// ---------- 2. ESLint ----------
if (!skipTs && (args.files === null || tsFiles.length)) {
  const target = args.files === null ? ["."] : tsFiles;
  const r = spawnSync(path.join(root, "node_modules/.bin/eslint"), ["-f", "json", ...target], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  let n = 0;
  try {
    for (const file of JSON.parse(r.stdout || "[]")) {
      for (const msg of file.messages) {
        n++;
        F.add({
          category: "eslint",
          severity: msg.severity === 2 ? "medium" : "low",
          file: path.relative(root, file.filePath).split(path.sep).join("/"),
          line: msg.line,
          rule: msg.ruleId || "eslint-parse",
          message: `ESLint: ${msg.message}`,
          confidence: "confirmed",
        });
      }
    }
  } catch {
    F.meta.eslintError = (r.stderr || "").slice(0, 500);
  }
  F.meta.eslint = { ran: true, messages: n };
}

// ---------- 3+4. MDX + frontmatter ----------
const matter = req("gray-matter");
const { compile } = await import(req.resolve("@mdx-js/mdx"));
const remarkGfm = (await import(req.resolve("remark-gfm"))).default;

let mdxOk = 0;
const snippets = [];
for (const f of mdxFiles) {
  const text = read(root, f);
  try {
    matter(text);
  } catch (e) {
    F.add({
      category: "frontmatter",
      severity: "high",
      file: f,
      line: (e.mark?.line ?? 0) + 2,
      rule: "CODE-FRONTMATTER-YAML",
      message: `الـ frontmatter مش YAML صحيح: ${String(e.reason || e.message).slice(0, 140)}`,
      hint: "غالباً نقطتين (:) أو علامة اقتباس داخل قيمة بدون تنصيص.",
      confidence: "confirmed",
    });
    continue;
  }
  const { body, bodyLine } = splitFrontmatter(text);
  try {
    await compile(body, { remarkPlugins: [remarkGfm], development: false });
    mdxOk++;
  } catch (e) {
    const line = (e.place?.line ?? e.line ?? e.position?.start?.line ?? 1) + bodyLine - 1;
    F.add({
      category: "mdx",
      severity: "high",
      file: f,
      line,
      rule: "CODE-MDX-COMPILE",
      message: `ملف MDX ما بيترجم: ${String(e.reason || e.message).split("\n")[0].slice(0, 160)}`,
      hint: "غالباً < أو { بنص عادي — حطها داخل `code` أو اهرب منها بـ \\.",
      confidence: "confirmed",
    });
  }
  collectSnippets(f, text, snippets);
}
F.meta.mdx = { files: mdxFiles.length, compiled: mdxOk };

// ---------- 5. JSON content ----------
for (const f of jsonFiles) {
  try {
    JSON.parse(read(root, f));
  } catch (e) {
    const pos = +(String(e.message).match(/position (\d+)/)?.[1] ?? 0);
    F.add({
      category: "json",
      severity: "high",
      file: f,
      line: pos ? lineOf(read(root, f), pos) : 1,
      rule: "CODE-JSON-PARSE",
      message: `ملف JSON غير صالح: ${e.message.slice(0, 140)}`,
      confidence: "confirmed",
    });
  }
}

// ---------- 6. Code snippets inside lessons ----------
function collectSnippets(file, text, out) {
  const re = /^```([A-Za-z0-9+#-]*)[^\n]*\n([\s\S]*?)^```\s*$/gm;
  let m;
  while ((m = re.exec(text))) {
    const lang = m[1].toLowerCase();
    const code = m[2];
    const line = lineOf(text, m.index);
    // Skip intentionally-broken teaching examples: a ❌/"خطأ"/"wrong" marker nearby.
    const before = text.slice(Math.max(0, m.index - 240), m.index);
    const intentional = /❌|🚫|✗|خطأ|خاطئ|غلط|wrong|bad|incorrect|لا تفعل|تجنّب|تجنب|سيء|سيئ/i.test(before + code.slice(0, 200));
    if (intentional) continue;
    if (/^\s*$/.test(code) || /\.\.\.\s*$|…/.test(code) && code.split("\n").length < 4) continue;
    out.push({ file, line, lang, code });
  }
}

let ts;
try {
  ts = req("typescript");
} catch {}
const parseLangs = { js: "js", javascript: "js", jsx: "jsx", ts: "ts", typescript: "ts", tsx: "tsx", json: "json" };
const pySnips = [];
let snipChecked = 0;
for (const s of snippets) {
  const kind = parseLangs[s.lang];
  if (kind === "json") {
    snipChecked++;
    const c = s.code.trim();
    if (/^\s*\/\/|\.\.\.|\/\*|<[^>]+>/.test(c)) continue; // jsonc / placeholders
    try {
      JSON.parse(c);
    } catch (e) {
      addSnip(s, `مثال JSON مش صالح: ${e.message.slice(0, 100)}`);
    }
  } else if (kind && ts) {
    snipChecked++;
    const ext = kind === "js" ? ".js" : kind === "jsx" ? ".jsx" : kind === "tsx" ? ".tsx" : ".ts";
    const sf = ts.createSourceFile("x" + ext, s.code, ts.ScriptTarget.Latest, true);
    const d = sf.parseDiagnostics?.[0];
    if (d) {
      const l = sf.getLineAndCharacterOfPosition(d.start ?? 0).line;
      addSnip(s, `مثال ${s.lang} فيه خطأ صيغة: ${ts.flattenDiagnosticMessageText(d.messageText, " ").slice(0, 120)}`, l + 1);
    }
  } else if (s.lang === "python" || s.lang === "py") {
    snipChecked++;
    pySnips.push(s);
  }
}
if (pySnips.length) {
  const prog = `
import ast, json, sys, warnings
warnings.simplefilter("ignore")
data = json.load(sys.stdin); out = []
for i, code in enumerate(data):
    if any(l.lstrip().startswith((">>>", "$ ", "...")) for l in code.splitlines()):
        continue
    try: ast.parse(code)
    except SyntaxError as e: out.append([i, e.lineno or 1, (e.msg or "")[:120]])
print(json.dumps(out))`;
  const r = spawnSync("python3", ["-I", "-c", prog], { input: JSON.stringify(pySnips.map((s) => s.code)), encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  try {
    for (const [i, l, msg] of JSON.parse(r.stdout)) addSnip(pySnips[i], `مثال Python فيه خطأ صيغة: ${msg}`, l);
  } catch {
    F.meta.pythonError = (r.stderr || "").slice(0, 300);
  }
}
F.meta.snippets = { found: snippets.length, checked: snipChecked };

function addSnip(s, message, innerLine = 1) {
  F.add({
    category: "code-snippet",
    severity: "low",
    file: s.file,
    line: s.line + innerLine,
    rule: "CODE-SNIPPET-SYNTAX",
    message,
    hint: "إذا المثال مقصود يكون خاطئ، حط ❌ أو كلمة «خطأ» قبله. غير هيك صلّحه — الطالب رح ينسخه.",
    confidence: "verify",
  });
}

F.meta.seconds = Math.round((Date.now() - t0) / 1000);
F.write(args.out, args.quiet);

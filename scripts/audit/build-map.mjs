#!/usr/bin/env node
// scripts/audit/build-map.mjs
// 📍 خريطة: منطقة "أدوات الفحص" ← رسّام خريطة المشروع
// Builds the "mall map" of the repository:
//   audit-out/map.json  — zones → shops → files, import graph, findings per file
//   docs/project-map/MAP.md — the same map as text, one section per zone
// The interactive page (docs/project-map/index.html) reads map.json.
//
// Usage: node scripts/audit/build-map.mjs [--findings audit-out]   (run the scanners first)

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { trackedFiles, read } from "./lib.mjs";
import { ZONES, FOLDER_NOTES } from "./zones.mjs";

const root = process.cwd();
const req = createRequire(path.join(root, "package.json"));
const matter = req("gray-matter");
const findingsDir = path.resolve(process.argv.includes("--findings") ? process.argv[process.argv.indexOf("--findings") + 1] : "audit-out");
const files = trackedFiles(root).filter((f) => !/^(audit-out|screenshot)\//.test(f));
const fileSet = new Set(files);
const SEV = ["critical", "high", "medium", "low", "info"];

// ---------------------------------------------------------------- findings
const findings = { main: [], branches: {} };
const loadDir = (dir) => ["code", "security", "content"].flatMap((k) => {
  const p = path.join(dir, k + ".json");
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")).findings : [];
});
findings.main = loadDir(path.join(findingsDir, "main"));
let branchSummary = null;
const bsPath = path.join(findingsDir, "branches/summary.json");
if (fs.existsSync(bsPath)) {
  branchSummary = JSON.parse(fs.readFileSync(bsPath, "utf8"));
  for (const b of branchSummary.branches) {
    const dir = path.join(findingsDir, "branches", b.branch);
    if (fs.existsSync(dir)) findings.branches[b.branch] = loadDir(dir);
  }
}

// ---------------------------------------------------------------- helpers
const zoneOf = (f) => ZONES.find((z) => z.match(f)) ?? ZONES.at(-1);
const shopOf = (f, z) => (z.shop ? z.shop(f) : path.dirname(f));
const routeOf = (f) => {
  const m = f.match(/^src\/app\/(.*?)(?:\/)?(page|route|layout)\.(tsx?|jsx?)$/) || f.match(/^src\/app\/()(page|route|layout)\.(tsx?)$/);
  if (!m) return null;
  const segs = m[1].split("/").filter((s) => s && !/^\(.*\)$/.test(s) && !s.startsWith("_"));
  return { kind: m[2], url: "/" + segs.join("/") };
};
const headerComment = (text) => {
  const lines = text.split("\n").slice(0, 60);
  let buf = [];
  for (const l of lines) {
    const t = l.trim();
    if (/^\/\/\s?/.test(t) && !/^\/\/\s*(eslint|@ts-|#region|prettier)/.test(t)) buf.push(t.replace(/^\/\/\s?/, ""));
    else if (/^\/?\*+\s?/.test(t) && !/^\/\*\*?\s*@/.test(t) && buf.length < 6 && t !== "*/" && t !== "/**") buf.push(t.replace(/^\/?\*+\s?/, "").replace(/\*\/$/, ""));
    else if (buf.length) break;
  }
  const s = buf.join(" ").replace(/📍.*?←[^.]*\.?/, "").trim();
  return s ? s.slice(0, 260) : null;
};
const resolveImport = (from, spec) => {
  let base;
  if (spec.startsWith("@/")) base = "src/" + spec.slice(2);
  else if (spec.startsWith(".")) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec));
  else return null;
  for (const ext of ["", ".ts", ".tsx", ".mjs", ".js", ".json", "/index.ts", "/index.tsx"]) if (fileSet.has(base + ext)) return base + ext;
  return null;
};

// ---------------------------------------------------------------- files
const nodes = {};
for (const f of files) {
  const z = zoneOf(f);
  const isText = !/\.(png|jpe?g|gif|webp|ico|pdf|woff2?|ttf|PNG)$/.test(f);
  let text = "";
  if (isText) {
    try {
      text = read(root, f);
    } catch {}
  }
  const n = { path: f, zone: z.id, shop: shopOf(f, z), lines: text ? text.split("\n").length : 0, imports: [], usedBy: [] };
  const r = routeOf(f);
  if (r) n.route = r;
  if (/\.(ts|tsx|mjs|js)$/.test(f)) {
    n.note = headerComment(text);
    for (const m of text.matchAll(/(?:import|export)\s[^'"]*?from\s+["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g)) {
      const t = resolveImport(f, m[1] || m[2]);
      if (t && !n.imports.includes(t)) n.imports.push(t);
    }
    if (/^\s*["']use server["']/.test(text)) n.tags = [...(n.tags || []), "server-action"];
    if (/^\s*["']use client["']/.test(text)) n.tags = [...(n.tags || []), "client"];
  } else if (f.endsWith(".mdx")) {
    try {
      const d = matter(text).data;
      n.title = d.title;
      if (d.order !== undefined) n.order = d.order;
    } catch {}
  }
  nodes[f] = n;
}
for (const n of Object.values(nodes)) for (const t of n.imports) nodes[t]?.usedBy.push(n.path);

// attach findings
const attach = (list, key) => {
  for (const x of list) {
    const n = nodes[x.file];
    if (!n) continue;
    (n[key] ??= []).push(x);
  }
};
attach(findings.main, "findings");

// ---------------------------------------------------------------- zones
const zones = ZONES.map((z) => ({ id: z.id, name: z.name, emoji: z.emoji, color: z.color, area: z.area, desc: z.desc, shops: {} }));
const zById = Object.fromEntries(zones.map((z) => [z.id, z]));
for (const n of Object.values(nodes)) {
  const z = zById[n.zone];
  const s = (z.shops[n.shop] ??= { id: n.shop, name: FOLDER_NOTES[n.shop]?.name ?? n.shop.split("/").slice(-1)[0], note: FOLDER_NOTES[n.shop]?.note ?? null, files: [], lines: 0, sev: Object.fromEntries(SEV.map((s) => [s, 0])) });
  s.files.push(n.path);
  s.lines += n.lines;
  for (const x of n.findings ?? []) s.sev[x.severity]++;
}
for (const z of zones) {
  z.shops = Object.values(z.shops).sort((a, b) => b.lines - a.lines);
  z.files = z.shops.reduce((a, s) => a + s.files.length, 0);
  z.lines = z.shops.reduce((a, s) => a + s.lines, 0);
  z.sev = Object.fromEntries(SEV.map((k) => [k, z.shops.reduce((a, s) => a + s.sev[k], 0)]));
}

// ---------------------------------------------------------------- write json
const commit = (() => {
  try {
    return req("node:child_process").execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
})();
const map = {
  generatedAt: new Date().toISOString(),
  commit,
  totals: { files: files.length, findings: findings.main.length },
  zones,
  nodes,
  branches: branchSummary ? branchSummary.branches.filter((b) => b.status !== "merged").map((b) => ({ ...b, findings: findings.branches[b.branch] ?? [] })) : [],
};
fs.mkdirSync(path.join(root, "audit-out"), { recursive: true });
fs.writeFileSync(path.join(root, "audit-out/map.json"), JSON.stringify(map));
console.log(`map.json: ${files.length} files, ${zones.length} zones, ${findings.main.length} main findings, ${map.branches.length} branches`);

// ---------------------------------------------------------------- MAP.md
const sevIcon = { critical: "🟥", high: "🔴", medium: "🟠", low: "🟡", info: "🔵" };
const sevLine = (s) => SEV.filter((k) => s[k]).map((k) => `${sevIcon[k]} ${s[k]}`).join(" ") || "✅";
let md = `# 🗺️ خريطة مشروع The Code Fix

> زي خريطة المول: كل **منطقة** (zone) فيها **محلات** (مجلدات)، وكل محل فيه ملفات.
> النسخة التفاعلية: افتح \`docs/project-map/index.html\` (أو رابط الـ artifact).
> هذا الملف بيتولّد تلقائياً — لا تعدّله يدوياً. حدّثه بـ: \`node scripts/audit/run-all.mjs\`

**Commit:** \`${commit}\` · **تاريخ:** ${map.generatedAt.slice(0, 10)} · **ملفات:** ${files.length} · **ملاحظات الفحص على main:** ${findings.main.length}

## مفتاح الخريطة

| الرمز | المعنى |
|---|---|
| 🟥 critical | لازم ينصلّح فوراً |
| 🔴 high | مهم — قبل أي نشر |
| 🟠 medium | يستاهل يتصلّح |
| 🟡 low | تحسين / مراجعة |
| 🔵 info | معلومة للعلم |

## نظرة من فوق

\`\`\`
${asciiMap(zones)}
\`\`\`

| المنطقة | ملفات | أسطر | ملاحظات |
|---|---:|---:|---|
${zones.map((z) => `| ${z.emoji} [${z.name}](#${z.id}) | ${z.files} | ${z.lines.toLocaleString("en")} | ${sevLine(z.sev)} |`).join("\n")}

`;
for (const z of zones) {
  md += `\n## <a id="${z.id}"></a>${z.emoji} ${z.name}\n\n${z.desc}\n\n| المحل (مجلد) | ملفات | شو فيه | ملاحظات |\n|---|---:|---|---|\n`;
  for (const s of z.shops.slice(0, 60)) md += `| \`${s.id}\` | ${s.files.length} | ${s.note ?? ""} | ${sevLine(s.sev)} |\n`;
  if (z.shops.length > 60) md += `| … و${z.shops.length - 60} مجلد ثاني | | | |\n`;
  const top = z.shops.flatMap((s) => s.files.flatMap((f) => (nodes[f].findings ?? []).filter((x) => ["critical", "high", "medium"].includes(x.severity))));
  if (top.length) {
    md += `\n**📌 أهم الملاحظات هون:**\n\n`;
    for (const x of top.slice(0, 25)) md += `- ${sevIcon[x.severity]} \`${x.file}:${x.line ?? 1}\` — ${x.message}\n`;
    if (top.length > 25) md += `- … و${top.length - 25} ثانية (شوف الخريطة التفاعلية)\n`;
  }
}
if (map.branches.length) {
  md += `\n## 🌿 الفروع غير المدموجة\n\n| الفرع | الحالة | ملفات متغيرة | آخر commit | ملاحظات |\n|---|---|---:|---|---|\n`;
  const label = { "unique-applies": "بيندمج بسهولة", "unique-conflicts": "فيه تعارض مع main", "in-main": "موجود بـ main", unrelated: "تاريخ منفصل", merged: "مدموج" };
  for (const b of map.branches) {
    const s = Object.fromEntries(SEV.map((k) => [k, b.findings.filter((x) => x.severity === k).length]));
    md += `| \`${b.branch}\` | ${label[b.status] ?? b.status} | ${b.changedFiles ?? "-"} | ${b.lastCommit ?? "-"} | ${b.status === "unrelated" ? "—" : sevLine(s)} |\n`;
  }
}
fs.mkdirSync(path.join(root, "docs/project-map"), { recursive: true });
fs.writeFileSync(path.join(root, "docs/project-map/MAP.md"), md);
console.log("MAP.md written");

function asciiMap(zs) {
  const z = Object.fromEntries(zs.map((x) => [x.id, x]));
  const c = (id) => (z[id] ? `${z[id].emoji} ${z[id].name}`.padEnd(22).slice(0, 22) : "".padEnd(22));
  return [
    "┌──────────────────────────┬──────────────────────────┬──────────────────────────┐",
    `│ ${c("content")}   │ ${c("learning")}   │ ${c("admin")}   │`,
    "├──────────────────────────┼──────────────────────────┼──────────────────────────┤",
    `│ ${c("components")}   │ ${c("core")}   │ ${c("creators")}   │`,
    "├──────────────────────────┼──────────────────────────┼──────────────────────────┤",
    `│ ${c("lib")}   │ ${c("pipeline")}   │ ${c("accounts")}   │`,
    "├──────────────────────────┼──────────────────────────┼──────────────────────────┤",
    `│ ${c("data")}   │ ${c("quality")}   │ ${c("docs")}   │`,
    "├──────────────────────────┴──────────────────────────┴──────────────────────────┤",
    `│                 ${c("config")}  ← المدخل                                   │`,
    "└─────────────────────────────────────────────────────────────────────────────────┘",
  ].join("\n");
}

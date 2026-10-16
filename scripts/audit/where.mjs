#!/usr/bin/env node
// scripts/audit/where.mjs
// 📍 خريطة: منطقة "أدوات الفحص" ← "أنت هنا" من سطر الأوامر
// Prints where a file sits on the project map, what it imports, who uses it,
// and its open findings — without reading the file itself (saves tokens).
//
//   node scripts/audit/where.mjs src/lib/content.ts
//   node scripts/audit/where.mjs content.ts        (partial match)
//   node scripts/audit/where.mjs --summary [--branch NAME] [--rule SEC-] [--min medium] [--top 30]

import fs from "node:fs";

const map = JSON.parse(fs.readFileSync("audit-out/map.json", "utf8"));
const argv = process.argv.slice(2);
const opt = (k, d) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : d);
const SEV = ["critical", "high", "medium", "low", "info"];
const icon = { critical: "🟥", high: "🔴", medium: "🟠", low: "🟡", info: "🔵" };

if (argv.includes("--summary")) {
  const branch = opt("--branch", null);
  const min = SEV.indexOf(opt("--min", "info"));
  const rule = opt("--rule", "");
  const top = +opt("--top", 30);
  let list = branch ? map.branches.find((b) => b.branch === branch)?.findings ?? [] : Object.values(map.nodes).flatMap((n) => n.findings ?? []);
  list = list.filter((f) => SEV.indexOf(f.severity) <= min && f.rule.startsWith(rule));
  const byRule = {};
  for (const f of list) byRule[f.rule] = (byRule[f.rule] || 0) + 1;
  console.log(`${branch ?? "main"} — ${list.length} findings`);
  console.log(Object.entries(byRule).sort((a, b) => b[1] - a[1]).map(([r, n]) => `  ${r}: ${n}`).join("\n"));
  list.sort((a, b) => SEV.indexOf(a.severity) - SEV.indexOf(b.severity));
  for (const f of list.slice(0, top)) console.log(`${icon[f.severity]} ${f.file}:${f.line ?? 1}  [${f.rule}|${f.confidence}]  ${f.message}`);
  if (list.length > top) console.log(`… +${list.length - top} (use --top / --rule / --min)`);
  process.exit(0);
}

const q = argv[0];
if (!q) {
  console.log("usage: where.mjs <file|partial>  |  --summary [--branch B] [--rule R] [--min sev] [--top N]");
  process.exit(1);
}
const hits = Object.keys(map.nodes).filter((p) => p === q || p.endsWith("/" + q) || p.includes(q));
if (!hits.length) {
  console.log("not on the map:", q);
  process.exit(1);
}
for (const p of hits.slice(0, 5)) {
  const n = map.nodes[p];
  const z = map.zones.find((z) => z.id === n.zone);
  console.log(`\n📍 أنت هنا: ${z.emoji} ${z.name}  ›  ${n.shop}  ›  ${p}`);
  if (n.route) console.log(`   🌐 ${n.route.kind === "route" ? "API" : "صفحة"}: ${n.route.url}`);
  if (n.title) console.log(`   📄 ${n.title}`);
  if (n.note) console.log(`   💬 ${n.note.slice(0, 200)}`);
  console.log(`   📏 ${n.lines} سطر${n.tags ? "  ·  " + n.tags.join(", ") : ""}`);
  if (n.imports.length) console.log(`   ⬇️ بيستخدم (${n.imports.length}): ${n.imports.slice(0, 12).join(", ")}${n.imports.length > 12 ? " …" : ""}`);
  if (n.usedBy.length) console.log(`   ⬆️ مستخدم من (${n.usedBy.length}): ${n.usedBy.slice(0, 12).join(", ")}${n.usedBy.length > 12 ? " …" : ""}`);
  for (const f of n.findings ?? []) console.log(`   ${icon[f.severity]} سطر ${f.line ?? 1}: ${f.message}  [${f.rule}]`);
  for (const b of map.branches) for (const f of b.findings.filter((x) => x.file === p)) console.log(`   🌿 ${b.branch} ${icon[f.severity]} سطر ${f.line ?? 1}: ${f.message}`);
}
if (hits.length > 5) console.log(`\n… ${hits.length - 5} ملفات ثانية بتطابق "${q}"`);

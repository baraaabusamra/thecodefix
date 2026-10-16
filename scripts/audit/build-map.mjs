#!/usr/bin/env node
// scripts/audit/build-map.mjs
// 📍 خريطة: منطقة "مختبر الجودة" ← رسّام خريطة المول (V2)
//
// Builds the "mall map" of the monorepo from the real tree:
//   audit-out/map.json              zones → shops → files, import graph, package graph, findings
//   docs/project-map/MAP.md         the whole map as text
//   <package>/MAP.svg               "أنت هنا": the floor plan with this package highlighted
//   <package>/README.md             the map section (between <!-- map:start/end -->) refreshed
// The interactive page (docs/project-map/index.html) reads map.json.
//
// Usage: node scripts/audit/build-map.mjs   (run the scanners first for findings)

import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { trackedFiles, read } from "./lib.mjs";
import { ZONES, FOLDER_NOTES, FLOOR, GENERIC_NOTES } from "./zones.mjs";
import { PACKAGES } from "../v2/layout.mjs";

const root = process.cwd();
const req = createRequire(path.join(root, "package.json"));
const matter = req("gray-matter");
const findingsDir = path.resolve("audit-out");
const files = trackedFiles(root).filter((f) => !/^(audit-out)\//.test(f) && fs.existsSync(path.join(root, f)));
const fileSet = new Set(files);
const SEV = ["critical", "high", "medium", "low", "info"];
const ROLE_AR = { foundation: "حزمة أساس", module: "وحدة ميزة", app: "تطبيق", data: "بيانات", infra: "بنية المستودع" };

// ---------------------------------------------------------------- findings
const loadDir = (dir) =>
  ["code", "security", "content"].flatMap((k) => {
    const p = path.join(dir, k + ".json");
    return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, "utf8")).findings.filter((x) => fileSet.has(x.file)) : [];
  });
const mainFindings = loadDir(path.join(findingsDir, "main"));
let branchSummary = null;
const branchFindings = {};
const bsPath = path.join(findingsDir, "branches/summary.json");
if (fs.existsSync(bsPath)) {
  branchSummary = JSON.parse(fs.readFileSync(bsPath, "utf8"));
  for (const b of branchSummary.branches) {
    const dir = path.join(findingsDir, "branches", b.branch);
    if (fs.existsSync(dir)) branchFindings[b.branch] = ["code", "security", "content"].flatMap((k) => (fs.existsSync(path.join(dir, k + ".json")) ? JSON.parse(fs.readFileSync(path.join(dir, k + ".json"), "utf8")).findings : []));
  }
}

// ---------------------------------------------------------------- helpers
const zoneOf = (f) => ZONES.find((z) => z.match(f)) ?? ZONES.at(-1);
const pkgOf = (f) => Object.entries(PACKAGES).find(([, { dir }]) => f.startsWith(dir + "/"))?.[0] ?? null;
const routeOf = (f) => {
  const m = f.match(/^apps\/web\/src\/app\/(?:(.*)\/)?(page|route|layout)\.(tsx?)$/);
  if (!m) return null;
  const segs = (m[1] ?? "").split("/").filter((s) => s && !/^\(.*\)$/.test(s) && !s.startsWith("_"));
  return { kind: m[2], url: "/" + segs.join("/") };
};
const headerComment = (text) => {
  const buf = [];
  for (const l of text.split("\n").slice(0, 60)) {
    const t = l.trim();
    if (/^["']use (client|server)["'];?$/.test(t) && !buf.length) continue;
    if (/^\/\/\s?/.test(t) && !/^\/\/\s*(eslint|@ts-|#region|prettier)/.test(t)) buf.push(t.replace(/^\/\/\s?/, ""));
    else if (/^\/?\*+\s?/.test(t) && !/^\/\*\*?\s*@/.test(t) && buf.length < 6 && t !== "*/" && t !== "/**") buf.push(t.replace(/^\/?\*+\s?/, "").replace(/\*\/$/, ""));
    else if (buf.length) break;
  }
  const s = buf
    .filter((l) => !/^[\w./\[\]-]+\.(ts|tsx|mjs)$/.test(l.trim()))
    .join(" ")
    .replace(/📍[^←]*←\s*/, "")
    .trim();
  return s ? s.slice(0, 280) : null;
};
const EXT = ["", ".ts", ".tsx", ".mjs", ".js", ".json", "/index.ts", "/index.tsx"];
const resolveImport = (from, spec) => {
  let base;
  if (spec.startsWith("@/")) base = "apps/web/src/" + spec.slice(2);
  else if (spec.startsWith("@tcf/")) {
    const [scope, name, ...rest] = spec.split("/");
    const info = PACKAGES[`${scope}/${name}`];
    if (!info) return null;
    base = rest.length ? `${info.dir}/src/${rest.join("/")}` : `${info.dir}/src/index`;
  } else if (spec.startsWith(".")) base = path.posix.normalize(path.posix.join(path.posix.dirname(from), spec.split("?")[0]));
  else return null;
  const cands = [base];
  if (/\.m?js$/.test(base)) cands.push(base.replace(/\.m?js$/, ""));
  for (const b of cands) for (const ext of EXT) if (fileSet.has(b + ext)) return b + ext;
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
  const n = { path: f, zone: z.id, shop: z.shop(f), lines: text ? text.split("\n").length : 0, imports: [], usedBy: [] };
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
for (const x of mainFindings) (nodes[x.file].findings ??= []).push(x);

// package-level graph
const pkgDeps = {};
const pkgUsedBy = {};
const subpathUse = {}; // "@tcf/x/sub" -> count of importers outside the package
for (const n of Object.values(nodes)) {
  const a = pkgOf(n.path);
  for (const t of n.imports) {
    const b = pkgOf(t);
    if (!b || b === a) continue;
    if (a) (pkgDeps[a] ??= new Set()).add(b);
    (pkgUsedBy[b] ??= new Set()).add(a ?? (n.path.startsWith("tests/") ? "tests" : "scripts"));
    const sub = t.slice(PACKAGES[b].dir.length + 5).replace(/\.(tsx?)$/, "").replace(/^index$/, "");
    const key = sub ? `${b}/${sub}` : b;
    subpathUse[key] = (subpathUse[key] ?? 0) + 1;
  }
}

// ---------------------------------------------------------------- zones
function genericNote(shop) {
  const m = shop.match(/\(([^)]+)\)$/);
  if (m) return GENERIC_NOTES[`(${m[1]})`] ?? null;
  return GENERIC_NOTES[shop.split("/").pop()] ?? null;
}
const zones = ZONES.map((z) => ({ id: z.id, pkg: z.pkg ?? null, role: z.role, name: z.name, emoji: z.emoji, color: z.color, desc: z.desc, shops: {} }));
const zById = Object.fromEntries(zones.map((z) => [z.id, z]));
for (const n of Object.values(nodes)) {
  const z = zById[n.zone];
  const s = (z.shops[n.shop] ??= { id: n.shop, name: FOLDER_NOTES[n.shop]?.name ?? n.shop.split("/").slice(-1)[0], note: FOLDER_NOTES[n.shop]?.note ?? genericNote(n.shop), files: [], lines: 0, sev: Object.fromEntries(SEV.map((k) => [k, 0])) });
  s.files.push(n.path);
  s.lines += n.lines;
  for (const x of n.findings ?? []) s.sev[x.severity]++;
}
for (const z of zones) {
  z.shops = Object.values(z.shops).sort((a, b) => b.lines - a.lines);
  z.files = z.shops.reduce((a, s) => a + s.files.length, 0);
  z.lines = z.shops.reduce((a, s) => a + s.lines, 0);
  z.sev = Object.fromEntries(SEV.map((k) => [k, z.shops.reduce((a, s) => a + s.sev[k], 0)]));
  if (z.pkg) {
    z.deps = [...(pkgDeps[z.pkg] ?? [])].sort();
    z.usedBy = [...(pkgUsedBy[z.pkg] ?? [])].filter(Boolean).sort();
  }
}

// ---------------------------------------------------------------- map.json
const commit = (() => {
  try {
    return req("node:child_process").execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
})();
const map = {
  version: 2,
  generatedAt: new Date().toISOString(),
  commit,
  totals: { files: files.length, findings: mainFindings.length },
  floor: FLOOR,
  zones,
  nodes,
  branches: branchSummary ? branchSummary.branches.filter((b) => b.status !== "merged").map((b) => ({ ...b, findings: branchFindings[b.branch] ?? [] })) : [],
};
fs.mkdirSync(path.join(root, "audit-out"), { recursive: true });
fs.writeFileSync(path.join(root, "audit-out/map.json"), JSON.stringify(map));
console.log(`map.json: ${files.length} files, ${zones.length} zones, ${mainFindings.length} findings, ${map.branches.length} branches`);

// ---------------------------------------------------------------- floor-plan SVG ("أنت هنا")
const SHORT = { "content-tree": "content/", quality: "scripts · tests", docs: "docs", archive: "archive", config: "package.json · turbo.json · CI" };
const SUB = { "content-tree": "الدروس والمقالات لكل لغة", quality: "مختبر الجودة", docs: "التوثيق والقرارات", archive: "كود V1 محفوظ", config: "المدخل — إعدادات المستودع" };
function floorSvg(highlight) {
  const cols = FLOOR[0].length;
  const cw = 200, ch = 64, gap = 8, pad = 16, top = 44;
  const W = pad * 2 + cols * cw + (cols - 1) * gap;
  const H = top + pad + FLOOR.length * ch + (FLOOR.length - 1) * gap + 30;
  const boxes = {};
  FLOOR.forEach((row, r) =>
    row.forEach((id, c) => {
      const b = (boxes[id] ??= { r0: r, r1: r, c0: c, c1: c });
      b.r0 = Math.min(b.r0, r); b.r1 = Math.max(b.r1, r); b.c0 = Math.min(b.c0, c); b.c1 = Math.max(b.c1, c);
    })
  );
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="'Segoe UI', Tahoma, 'Noto Sans Arabic', Arial, sans-serif" role="img" aria-label="خريطة مشروع The Code Fix — ${esc(zById[highlight]?.name ?? "")}">`;
  out += `<rect width="${W}" height="${H}" rx="14" fill="#f4f6f3"/>`;
  out += `<text x="${W - pad}" y="28" text-anchor="end" font-size="15" font-weight="700" fill="#1d2421">خريطة The Code Fix V2</text>`;
  out += `<text x="${pad}" y="28" font-size="11" fill="#56605b">${esc(commit ?? "")}</text>`;
  for (const [id, b] of Object.entries(boxes)) {
    const z = zById[id];
    if (!z) continue;
    // RTL floor: first column is drawn on the right
    const x = pad + (cols - 1 - b.c1) * (cw + gap);
    const y = top + b.r0 * (ch + gap);
    const w = (b.c1 - b.c0 + 1) * cw + (b.c1 - b.c0) * gap;
    const h = (b.r1 - b.r0 + 1) * ch + (b.r1 - b.r0) * gap;
    const on = id === highlight;
    out += `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${z.color}" fill-opacity="${on ? 1 : 0.18}" stroke="${on ? "#1d2421" : z.color}" stroke-width="${on ? 3 : 1}"/>`;
    const label = z.pkg ? z.pkg.replace("@tcf/", "") : SHORT[id] ?? z.id;
    const sub = (z.pkg ? PACKAGES[z.pkg].desc : SUB[id] ?? "").split(/[،:(]/)[0].trim().slice(0, 30);
    const ink = on ? "#ffffff" : "#1d2421";
    out += `<text x="${x + w / 2}" y="${y + h / 2 - (sub ? 3 : -5)}" text-anchor="middle" font-size="${on ? 15 : 13}" font-weight="${on ? 700 : 600}" fill="${ink}">${esc(label)}</text>`;
    if (sub) out += `<text x="${x + w / 2}" y="${y + h / 2 + 15}" text-anchor="middle" font-size="11" fill="${ink}" fill-opacity="${on ? 0.95 : 0.7}">${esc(sub)}</text>`;
    out += `</g>`;
    if (on) {
      const px = x + w / 2, py = y - 2;
      out += `<path d="M${px} ${py} c-9 -12 -14 -18 -14 -25 a14 14 0 0 1 28 0 c0 7 -5 13 -14 25z" fill="#d7263d" stroke="#fff" stroke-width="2"/><circle cx="${px}" cy="${py - 25}" r="5" fill="#fff"/>`;
    }
  }
  out += `<text x="${W / 2}" y="${H - 12}" text-anchor="middle" font-size="12" fill="#56605b">الدبوس الأحمر = أنت هنا · npm run map لإعادة الرسم</text>`;
  return out + "</svg>\n";
}

// ---------------------------------------------------------------- per-package README + MAP.svg
const sevIcon = { critical: "🟥", high: "🔴", medium: "🟠", low: "🟡", info: "🔵" };
const sevLine = (s) => SEV.filter((k) => s[k]).map((k) => `${sevIcon[k]} ${s[k]}`).join(" ") || "✅ لا شيء";
const START = "<!-- map:start (generated by `npm run map` — edits inside are overwritten) -->";
const END = "<!-- map:end -->";
for (const z of zones.filter((x) => x.pkg)) {
  const dir = PACKAGES[z.pkg].dir;
  if (!fs.existsSync(dir)) continue;
  fs.writeFileSync(path.join(dir, "MAP.svg"), floorSvg(z.id));
  const exportsUsed = Object.entries(subpathUse)
    .filter(([k]) => k === z.pkg || k.startsWith(z.pkg + "/"))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12);
  const section = [
    START,
    "## 📍 أنت هنا",
    "",
    `![موقع ${z.pkg} على خريطة المشروع](./MAP.svg)`,
    "",
    "| | |",
    "|---|---|",
    `| النوع | ${ROLE_AR[z.role]} |`,
    `| المكان | \`${dir}\` |`,
    `| يعتمد على | ${z.deps.length ? z.deps.map((d) => `\`${d}\``).join("، ") : "لا شيء (أساس مستقل)"} |`,
    `| يستخدمه | ${z.usedBy.length ? z.usedBy.map((d) => `\`${d}\``).join("، ") : "—"} |`,
    `| الحجم | ${z.files} ملف · ${z.lines.toLocaleString("en")} سطر |`,
    `| ملاحظات الفحص | ${sevLine(z.sev)} |`,
    "",
    "### شو فيه",
    "",
    "| المجلد | ملفات | ملاحظة |",
    "|---|---:|---|",
    ...z.shops.map((s) => `| \`${s.id}\` | ${s.files.length} | ${s.note ?? ""} |`),
    "",
    ...(exportsUsed.length
      ? ["### الأكثر استخدامًا من الخارج", "", "| الاستيراد | عدد المستوردين |", "|---|---:|", ...exportsUsed.map(([k, n]) => `| \`${k}\` | ${n} |`), ""]
      : []),
    "اسأل الخريطة عن أي ملف: `node scripts/audit/where.mjs <اسم الملف>`",
    END,
  ].join("\n");
  const readme = path.join(dir, "README.md");
  let body = fs.existsSync(readme) ? fs.readFileSync(readme, "utf8") : `# ${z.emoji} ${z.pkg}\n\n${z.desc}\n\n${START}\n${END}\n`;
  if (!body.includes("<!-- map:start")) body += `\n${START}\n${END}\n`;
  body = body.replace(/<!-- map:start[\s\S]*?<!-- map:end -->/, section);
  fs.writeFileSync(readme, body);
}

// ---------------------------------------------------------------- MAP.md
const md = [];
md.push(`# 🗺️ خريطة مشروع The Code Fix — V2`, "");
md.push(`> زي خريطة المول: كل **منطقة** = حزمة أو وحدة أو جزء من المستودع، وكل **محل** = مجلد.`);
md.push(`> النسخة التفاعلية: \`docs/project-map/index.html\` (بعد \`npm run map\`). هذا الملف مولَّد — لا تعدّله يدويًا.`, "");
md.push(`**Commit:** \`${commit}\` · **ملفات:** ${files.length} · **ملاحظات الفحص:** ${mainFindings.length}`, "");
fs.mkdirSync(path.join(root, "docs/project-map"), { recursive: true });
fs.writeFileSync(path.join(root, "docs/project-map/FLOOR.svg"), floorSvg(null));
md.push(`![خريطة المشروع](./FLOOR.svg)`, "");
md.push("## الطوابق", "", "```");
const label = (id) => (zById[id] ? `${zById[id].emoji} ${zById[id].pkg ? zById[id].pkg.replace("@tcf/", "") : zById[id].id}` : id).padEnd(16).slice(0, 16);
for (const row of FLOOR) md.push("│ " + [...row].reverse().map(label).join(" │ ") + " │");
md.push("```", "");
md.push("| المنطقة | النوع | ملفات | أسطر | يعتمد على | ملاحظات |", "|---|---|---:|---:|---|---|");
for (const z of zones.filter((x) => x.files)) {
  md.push(`| ${z.emoji} [${z.name}](#${z.id}) | ${ROLE_AR[z.role]} | ${z.files} | ${z.lines.toLocaleString("en")} | ${(z.deps ?? []).map((d) => d.replace("@tcf/", "")).join("، ")} | ${sevLine(z.sev)} |`);
}
for (const z of zones.filter((x) => x.files)) {
  md.push("", `## <a id="${z.id}"></a>${z.emoji} ${z.name}`, "", z.desc, "");
  if (z.pkg) md.push(`📄 التفاصيل: [\`${PACKAGES[z.pkg].dir}/README.md\`](../../${PACKAGES[z.pkg].dir}/README.md)`, "");
  md.push("| المحل (مجلد) | ملفات | شو فيه | ملاحظات |", "|---|---:|---|---|");
  for (const s of z.shops.slice(0, 40)) md.push(`| \`${s.id}\` | ${s.files.length} | ${s.note ?? ""} | ${sevLine(s.sev)} |`);
  if (z.shops.length > 40) md.push(`| … و${z.shops.length - 40} مجلد ثاني | | | |`);
  const top = z.shops.flatMap((s) => s.files.flatMap((f) => (nodes[f].findings ?? []).filter((x) => ["critical", "high", "medium"].includes(x.severity))));
  if (top.length) {
    md.push("", "**📌 أهم الملاحظات هون:**", "");
    for (const x of top.slice(0, 20)) md.push(`- ${sevIcon[x.severity]} \`${x.file}:${x.line ?? 1}\` — ${x.message}`);
  }
}
if (map.branches.length) {
  md.push("", "## 🌿 الفروع غير المدموجة", "", "| الفرع | الحالة | ملفات | آخر commit | ملاحظات |", "|---|---|---:|---|---|");
  const L = { "unique-applies": "بيندمج", "unique-conflicts": "فيه تعارض", "in-main": "موجود بـ main", unrelated: "تاريخ منفصل" };
  for (const b of map.branches) {
    const s = Object.fromEntries(SEV.map((k) => [k, b.findings.filter((x) => x.severity === k).length]));
    md.push(`| \`${b.branch}\` | ${L[b.status] ?? b.status} | ${b.changedFiles ?? "-"} | ${b.lastCommit ?? "-"} | ${b.status === "unrelated" ? "—" : sevLine(s)} |`);
  }
}
fs.mkdirSync(path.join(root, "docs/project-map"), { recursive: true });
fs.writeFileSync(path.join(root, "docs/project-map/MAP.md"), md.join("\n") + "\n");
console.log("MAP.md, per-package README map sections and MAP.svg written");

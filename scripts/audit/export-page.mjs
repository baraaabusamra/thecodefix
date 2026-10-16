#!/usr/bin/env node
// scripts/audit/export-page.mjs
// 📍 خريطة: منطقة "أدوات الفحص" ← تصدير الخريطة كصفحة واحدة
// Writes map-data.js next to docs/project-map/index.html, and optionally a
// single self-contained HTML file (data inlined) for sharing or publishing.
//   node scripts/audit/export-page.mjs [--single out.html]

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const data = fs.readFileSync(path.join(root, "audit-out/map.json"), "utf8").replace(/<\//g, "<\\/").replace(/[\u2028\u2029]/g, " ");
fs.writeFileSync(path.join(root, "docs/project-map/map-data.js"), `window.MAP_DATA = ${data};\n`);
const i = process.argv.indexOf("--single");
if (i > 0) {
  const html = fs.readFileSync(path.join(root, "docs/project-map/index.html"), "utf8");
  const out = html.replace('<script src="map-data.js"></script>', () => `<script>window.MAP_DATA = ${data};</script>`);
  fs.writeFileSync(path.resolve(process.argv[i + 1]), out);
  console.log(`single page → ${process.argv[i + 1]} (${Math.round(out.length / 1024)} KB)`);
}
console.log("map-data.js updated");

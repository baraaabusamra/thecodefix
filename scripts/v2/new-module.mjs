#!/usr/bin/env node
// scripts/v2/new-module.mjs
// 📍 خريطة: منطقة "مختبر الجودة" ← إضافة وحدة أو حزمة جديدة بخطوة واحدة
//
// Scaffolds a new workspace package the way every other one is built, so the
// platform grows without drifting:
//   node scripts/v2/new-module.mjs subscriptions "الاشتراكات الشهرية وخطط الأسعار"
//   node scripts/v2/new-module.mjs i18n "قواميس الواجهة لكل لغة" --foundation
//
// It: registers the package in scripts/v2/layout.mjs (→ map, boundaries,
// workspaces), creates package.json + README + src/{ui,actions}, adds the
// module to MODULE_DEPS (or FOUNDATION_DEPS) in the architecture test with no
// dependencies, runs npm install to link it, and redraws the map.

import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

const [name, desc] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const foundation = process.argv.includes("--foundation");
if (!name || !/^[a-z][a-z0-9-]{1,30}$/.test(name) || !desc) {
  console.error('usage: new-module.mjs <kebab-name> "<وصف عربي قصير>" [--foundation]');
  process.exit(1);
}
const pkg = `@tcf/${name}`;
const dir = `${foundation ? "packages" : "modules"}/${name}`;
const role = foundation ? "foundation" : "module";
if (fs.existsSync(dir)) throw new Error(`${dir} already exists`);

// 1. layout.mjs
const layoutPath = "scripts/v2/layout.mjs";
let layout = fs.readFileSync(layoutPath, "utf8");
if (layout.includes(`"${pkg}"`)) throw new Error(`${pkg} already registered`);
layout = layout.replace(/(\n  "@tcf\/web": \{)/, `\n  "${pkg}": { dir: "${dir}", role: "${role}", desc: ${JSON.stringify(desc)} },$1`);
fs.writeFileSync(layoutPath, layout);

// 2. files
fs.mkdirSync(path.join(dir, "src", "ui"), { recursive: true });
if (!foundation) fs.mkdirSync(path.join(dir, "src", "actions"), { recursive: true });
fs.writeFileSync(path.join(dir, "src", "ui", ".gitkeep"), "");
if (!foundation) fs.writeFileSync(path.join(dir, "src", "actions", ".gitkeep"), "");
fs.writeFileSync(
  path.join(dir, "README.md"),
  `# 📦 ${pkg}

${foundation ? "حزمة أساس" : "وحدة ميزة"} · ${desc}

## القواعد

${
  foundation
    ? "- حزمة أساس: لا تستورد أي وحدة (modules/*) ولا الموقع (apps/web).\n- أي اعتماد على حزمة أساس أخرى يُضاف إلى FOUNDATION_DEPS في tests/architecture-boundaries.test.mjs مع سجل قرار (ADR)."
    : "- تستورد حزم الأساس فقط (packages/*). أي اعتماد على وحدة أخرى يحتاج سجل قرار (ADR) وإضافة إلى MODULE_DEPS.\n- كل Server Action في src/actions/ يفحص الهوية والصلاحية بنفسه (requireCapability / auth).\n- مكونات الواجهة في src/ui/ وتُستورد كـ `" + pkg + "/ui/<Name>`."
}
- اقرأ docs/v2/ARCHITECTURE.md قبل إضافة كود هنا.

<!-- map:start -->
<!-- map:end -->
`
);
fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: pkg, version: "0.0.0", private: true, description: desc, exports: { "./ui/*": "./src/ui/*.tsx", "./*": "./src/*.ts", "./package.json": "./package.json" }, dependencies: {} }, null, 2) + "\n");

// 3. architecture test allow-list
const testPath = "tests/architecture-boundaries.test.mjs";
let t = fs.readFileSync(testPath, "utf8");
t = foundation
  ? t.replace(/(const FOUNDATION_DEPS = \{\n)/, `$1  "${pkg}": [],\n`)
  : t.replace(/(const MODULE_DEPS = \{\n)/, `$1  "${pkg}": [],\n`);
fs.writeFileSync(testPath, t);

// 4. link + map
spawnSync("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], { stdio: "inherit" });
spawnSync(process.execPath, ["scripts/v2/workspaces.mjs"], { stdio: "inherit" });
spawnSync(process.execPath, ["scripts/audit/build-map.mjs"], { stdio: "inherit" });
console.log(`\ncreated ${pkg} in ${dir}.
next:
  - give it a floor position and a look: scripts/audit/zones.mjs (FLOOR, LOOK)
  - write the code; import it from apps/web as "${pkg}/<file>" or "${pkg}/ui/<Component>"
  - record the decision: docs/v2/adr/NNNN-${name}.md
  - git add ${dir} ${layoutPath} ${testPath} package-lock.json`);
try {
  execFileSync("git", ["add", "-N", dir]);
} catch {}

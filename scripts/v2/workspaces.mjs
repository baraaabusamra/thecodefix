#!/usr/bin/env node
// scripts/v2/workspaces.mjs
// 📍 خريطة: منطقة "مختبر الجودة" ← مولّد package.json لكل حزمة ووحدة
//
// Writes (or refreshes) the package.json of every workspace listed in
// scripts/v2/layout.mjs. Each package declares exactly the dependencies its
// own source imports — computed, not hand-maintained — with the version
// ranges pinned in the root package.json. Run it after adding a dependency
// to a package's code:  node scripts/v2/workspaces.mjs

import fs from "node:fs";
import path from "node:path";
import { builtinModules } from "node:module";
import { PACKAGES } from "./layout.mjs";

const root = process.cwd();
const rootPkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const versions = { ...rootPkg.devDependencies, ...rootPkg.dependencies };
const builtins = new Set(builtinModules.flatMap((m) => [m, `node:${m}`]));

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === "node_modules" || e.name === ".next") continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|mts|js|mjs|cjs|css)$/.test(e.name)) out.push(p);
  }
  return out;
}

const SPEC = /(?:import|export)\s[^'"`;]*?from\s*["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)|import\s+["']([^"']+)["']|@import\s+["']([^"']+)["']/g;

function packageName(spec) {
  if (spec.startsWith(".") || spec.startsWith("/") || spec.startsWith("@/")) return null;
  const parts = spec.split("/");
  const name = spec.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0];
  return builtins.has(name) || builtins.has(spec) ? null : name;
}

const results = {};
for (const [name, info] of Object.entries(PACKAGES)) {
  const dir = path.join(root, info.dir);
  if (!fs.existsSync(dir)) continue;
  const srcDir = info.role === "app" ? dir : path.join(dir, "src");
  const deps = new Set();
  for (const f of walk(srcDir)) {
    const text = fs.readFileSync(f, "utf8");
    for (const m of text.matchAll(SPEC)) {
      const n = packageName(m[1] || m[2] || m[3] || m[4]);
      if (n && n !== name) deps.add(n);
    }
  }
  // next.config / postcss for the app
  if (info.role === "app") ["next", "react", "react-dom", "@tailwindcss/postcss", "tailwindcss"].forEach((d) => deps.add(d));
  const dependencies = {};
  const missing = [];
  for (const d of [...deps].sort()) {
    if (d.startsWith("@tcf/")) dependencies[d] = "*";
    else if (versions[d]) dependencies[d] = versions[d];
    else if (d.startsWith("@types/") || d === "server-only") continue;
    else missing.push(d);
  }
  const pkgPath = path.join(dir, "package.json");
  const prev = fs.existsSync(pkgPath) ? JSON.parse(fs.readFileSync(pkgPath, "utf8")) : {};
  const hasIndex = fs.existsSync(path.join(dir, "src/index.ts"));
  const pkg = {
    name,
    version: prev.version ?? "0.0.0",
    private: true,
    description: info.desc,
    ...(info.role === "app"
      ? { scripts: prev.scripts ?? { dev: "next dev", build: "next build", start: "next start" } }
      : {
          // Just-in-Time internal package: consumers compile the TypeScript
          // source directly (Next.js/Turbopack, tsx, tsc) — no build step.
          exports: {
            ...(hasIndex ? { ".": "./src/index.ts" } : {}),
            "./ui/*": "./src/ui/*.tsx",
            "./*": "./src/*.ts",
            "./package.json": "./package.json",
          },
        }),
    dependencies,
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  results[name] = { deps: Object.keys(dependencies).length, internal: Object.keys(dependencies).filter((d) => d.startsWith("@tcf/")), missing };
}
for (const [n, r] of Object.entries(results)) {
  console.log(`${n.padEnd(20)} deps=${String(r.deps).padStart(2)} internal=[${r.internal.join(", ")}]${r.missing.length ? "  MISSING: " + r.missing.join(", ") : ""}`);
}

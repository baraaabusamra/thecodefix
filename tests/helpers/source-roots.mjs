// tests/helpers/source-roots.mjs
// 📍 خريطة: مختبر الجودة ← أين يعيش كود التطبيق في V2
//
// V1 kept all application code under src/. In V2 it is spread over the web
// app, the foundation packages and the feature modules. Tests that scan "all
// application code" walk these roots instead of a single src/ folder.

import fs from "node:fs";
import path from "node:path";

/** Repo-relative roots that hold application source. */
export function sourceRoots() {
  const roots = ["apps/web/src"];
  for (const group of ["packages", "modules"]) {
    if (!fs.existsSync(group)) continue;
    for (const name of fs.readdirSync(group).sort()) {
      const src = path.join(group, name, "src");
      if (fs.existsSync(src)) roots.push(src.replaceAll("\\", "/"));
    }
  }
  return roots;
}

/** Roots that hold React UI: every package/module `src/ui`, plus the web app. */
export function uiRoots() {
  return sourceRoots().filter((r) => r === "apps/web/src" || fs.existsSync(path.join(r, "ui"))).map((r) => (r === "apps/web/src" ? r : `${r}/ui`));
}

/** Every file under the given roots matching `pattern` (repo-relative, forward slashes). */
export function sourceFiles(pattern = /\.(tsx?|jsx?|mjs)$/, roots = sourceRoots()) {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (pattern.test(e.name)) out.push(p.replaceAll("\\", "/"));
    }
  };
  for (const r of roots) if (fs.existsSync(r)) walk(r);
  return out.sort();
}

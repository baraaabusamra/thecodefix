// packages/content/src/paths.ts
// 📍 خريطة: محرّك المحتوى ← أين يعيش المحتوى على القرص
//
// V1 read every collection from `path.join(process.cwd(), "src", "content", …)`,
// which tied the content to one app's working directory. In V2 the content is a
// top-level tree shared by every app (web today, API/mobile/admin tomorrow):
//
//   content/<locale>/<collection>/…   editorial content per language (ar, en…)
//   content/data/<collection>/…       locale-neutral factual data (universities…)
//
// The root is found once per process: TCF_CONTENT_ROOT if set, otherwise the
// nearest `content/` directory (with an `ar/` tree) walking up from the
// working directory. That works from the repo root (tests, scripts), from
// apps/web (next dev / build) and on Vercel, where the traced files keep the
// monorepo layout (see apps/web/next.config.ts → outputFileTracingIncludes).

import fs from "node:fs";
import path from "node:path";
import { DEFAULT_LOCALE, type Locale } from "./i18n";

let cachedRoot: string | null = null;

/** Absolute path of the repository's `content/` directory. */
export function contentRoot(): string {
  if (cachedRoot) return cachedRoot;
  const fromEnv = process.env.TCF_CONTENT_ROOT;
  if (fromEnv) return (cachedRoot = path.resolve(fromEnv));
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "content");
    if (fs.existsSync(path.join(candidate, DEFAULT_LOCALE))) return (cachedRoot = candidate);
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return (cachedRoot = path.join(process.cwd(), "content"));
}

/** Directory of an editorial collection ("tracks", "blog", "reference", …) for a locale. */
export function contentDir(collection: string, locale: Locale = DEFAULT_LOCALE): string {
  return path.join(contentRoot(), locale, collection);
}

/** Directory of a locale-neutral data collection ("academic-universities", …). */
export function dataDir(collection: string): string {
  return path.join(contentRoot(), "data", collection);
}

/** Test hook: forget the cached root (e.g. after changing TCF_CONTENT_ROOT). */
export function resetContentRootCache(): void {
  cachedRoot = null;
}

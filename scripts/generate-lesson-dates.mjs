// Generates src/content/lesson-dates.json: "<tech>/<lesson>" -> "YYYY-MM-DD"
// (date of the last git commit that touched the lesson's MDX file).
//
// Run locally after adding/editing lessons, then commit the JSON:
//   npm run dates:generate
//
// The JSON is committed (not built on Vercel) because Vercel builds use a
// shallow clone whose git history can't answer "when did this file last
// change". Lesson pages read it for the visible "آخر تحديث" line and the
// dateModified JSON-LD field (E-E-A-T freshness signals).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const TRACKS_DIR = path.join("content", "ar", "tracks");
const OUT_FILE = path.join("content", "data", "lesson-dates.json");

// One git call for the whole history: newest-first commit dates with the
// files each commit touched. The FIRST time a file appears is its
// last-modified date.
const log = execFileSync(
  "git",
  ["log", "--format=%as", "--name-only", "--", TRACKS_DIR],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
);

const dates = {};
let current = "";
for (const line of log.split("\n")) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(line)) {
    current = line;
    continue;
  }
  const m = line.match(/^src\/content\/tracks\/([^/]+)\/(.+)\.mdx$/);
  if (m && !m[2].startsWith("_")) {
    const key = `${m[1]}/${m[2]}`;
    if (!(key in dates)) dates[key] = current;
  }
}

// Drop entries whose file no longer exists (renamed/deleted lessons).
for (const key of Object.keys(dates)) {
  if (!fs.existsSync(path.join(TRACKS_DIR, `${key}.mdx`))) delete dates[key];
}

const sorted = Object.fromEntries(
  Object.entries(dates).sort(([a], [b]) => a.localeCompare(b))
);
fs.writeFileSync(OUT_FILE, JSON.stringify(sorted, null, 2) + "\n");
console.log(`Wrote ${Object.keys(sorted).length} lesson dates to ${OUT_FILE}`);

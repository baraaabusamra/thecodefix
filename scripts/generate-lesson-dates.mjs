// Generates content/data/lesson-dates.json: "<tech>/<lesson>" -> "YYYY-MM-DD"
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
import { currentLessons, recordPublished } from "./check-lesson-redirects.mjs";

const TRACKS_DIR = path.join("content", "ar", "tracks");
const OUT_FILE = path.join("content", "data", "lesson-dates.json");

// One git call for the whole history: newest-first commit dates with the
// files each commit touched. The FIRST time a file appears is its
// last-modified date.
//
// V2 moved every lesson from content/ar/tracks/ to content/ar/tracks/. A pure
// move is not an edit, so renames are detected (-M, with a limit high enough
// for the 2,000-file restructure commit) and a 100%-similar rename is skipped
// — otherwise every lesson would claim the restructure date as its
// "last updated", which seo-technical-policy §13 forbids. Paths from both
// layouts map to the same "<track>/<lesson>" key.
const log = execFileSync(
  "git",
  ["-c", "diff.renameLimit=100000", "log", "-M", "--format=%as", "--name-status", "--", TRACKS_DIR, "src/content/tracks"],
  { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }
);

const LESSON = /^(?:src\/content|content\/ar)\/tracks\/([^/]+)\/(.+)\.mdx$/;
const dates = {};
let current = "";
for (const line of log.split("\n")) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(line)) {
    current = line;
    continue;
  }
  const parts = line.split("\t");
  if (parts.length < 2) continue;
  const status = parts[0];
  if (status === "R100" || status === "D") continue; // pure move / deletion: not an edit
  const file = status.startsWith("R") || status.startsWith("C") ? parts[2] : parts[1];
  const m = file?.match(LESSON);
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

// Record every live lesson as published (append-only), so removing or
// renaming one later without a redirect fails check:lesson-redirects.
const recorded = recordPublished(currentLessons());
if (recorded) console.log(`Recorded ${recorded} new lesson(s) in content/data/published-lessons.json`);

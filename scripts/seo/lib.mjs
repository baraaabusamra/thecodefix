// Shared helpers for the SEO growth scripts (report.mjs, opportunities.mjs,
// check-snapshots.mjs). Pure functions take plain objects so tests can feed
// fixtures; the fs helpers resolve paths from the repo root (process.cwd()).
//
// Data: docs/seo/gsc/<YYYY>-W<ww>.json — one Search Console snapshot per
// Mon–Sun week, written by scripts/seo/gsc_collect.py (see
// .claude/skills/gsc-snapshot). Forecast: docs/seo/forecast.json.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const SNAP_DIR = "docs/seo/gsc";
export const FORECAST_FILE = "docs/seo/forecast.json";
export const SCHEMA = 1;
const WEEK_FILE = /^\d{4}-W\d{2}\.json$/;

// ---------- snapshots ----------

export function sha256(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

/** Problems with one parsed snapshot (empty array = valid). */
export function validateSnapshot(snap, fileName = "") {
  const errs = [];
  if (snap?.schema !== SCHEMA) errs.push(`schema must be ${SCHEMA}`);
  for (const k of ["week", "start", "end", "totals", "buckets", "columns", "daily", "pages", "queries", "page_queries"]) {
    if (snap?.[k] === undefined) errs.push(`missing ${k}`);
  }
  if (errs.length) return errs;
  if (fileName && path.basename(fileName) !== `${snap.week}.json`) errs.push(`file name must be ${snap.week}.json`);
  const start = new Date(`${snap.start}T00:00:00Z`);
  if (start.getUTCDay() !== 1) errs.push("start must be a Monday");
  if (isoWeek(snap.start) !== snap.week) errs.push(`week ${snap.week} does not match start ${snap.start}`);
  for (const k of ["daily", "pages", "queries", "page_queries"]) {
    const width = snap.columns[k]?.length;
    snap[k].forEach((row, i) => {
      if (!Array.isArray(row) || row.length !== width) errs.push(`${k}[${i}] has ${row?.length} cells, expected ${width}`);
    });
  }
  const dailyImpr = snap.daily.reduce((s, r) => s + r[2], 0);
  if (dailyImpr !== snap.totals.impressions) errs.push(`daily impressions ${dailyImpr} != totals ${snap.totals.impressions}`);
  return errs;
}

export function loadSnapshots(dir = SNAP_DIR) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => WEEK_FILE.test(f))
    .sort()
    .map((f) => {
      const snap = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
      const errs = validateSnapshot(snap, f);
      if (errs.length) throw new Error(`${dir}/${f}: ${errs.join("; ")}`);
      return snap;
    });
}

/** Rows of a snapshot table as objects keyed by its column names. */
export function rows(snap, table) {
  const cols = snap.columns[table];
  return snap[table].map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
}

// ---------- dates ----------

/** ISO week label ("2026-W42") of a YYYY-MM-DD date. */
export function isoWeek(dateStr) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7; // Mon=0
  d.setUTCDate(d.getUTCDate() - day + 3); // Thursday of this week
  const year = d.getUTCFullYear(); // the ISO year is the Thursday's year
  const week = 1 + Math.floor((d - Date.UTC(year, 0, 1)) / 86400000 / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

/** "2026-11" for the month most of a week falls in (its Thursday). */
export function weekMonth(startDate) {
  const d = new Date(`${startDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 3);
  return d.toISOString().slice(0, 7);
}

// ---------- metrics ----------

/** The forecast metric: impressions without `site:` owner checks (they are not search demand). */
export function demandImpressions(snap) {
  return snap.totals.impressions - (snap.buckets.site?.impressions ?? 0);
}

/** Share of a week's impressions that came from named `site:` queries (owner checks). */
export function ownerCheckShare(snap) {
  return snap.totals.impressions ? (snap.buckets.site?.impressions ?? 0) / snap.totals.impressions : 0;
}

// At or above this share, the week's totals are dominated by the owner's own
// site: searches; those usually also leave anonymised impressions behind, so
// even demandImpressions() overstates real demand for that week.
export const OWNER_CHECK_FLAG = 0.15;

export function weekSummary(snap) {
  const b = snap.buckets;
  return {
    ownerCheck: ownerCheckShare(snap) >= OWNER_CHECK_FLAG,
    week: snap.week,
    start: snap.start,
    complete: snap.complete !== false,
    clicks: snap.totals.clicks,
    impressions: snap.totals.impressions,
    demand: demandImpressions(snap),
    position: snap.totals.position,
    brandClicks: b.brand?.clicks ?? 0,
    otherImpressions: b.other?.impressions ?? 0,
    otherClicks: b.other?.clicks ?? 0,
    otherPosition: b.other?.position ?? null,
    anonymized: b.anonymized_impressions ?? 0,
  };
}

/** Sum clicks/impressions and impression-weighted position over rows grouped by keyFn. */
export function aggregate(rowList, keyFn) {
  const out = new Map();
  for (const r of rowList) {
    const k = keyFn(r);
    const a = out.get(k) ?? { key: k, clicks: 0, impressions: 0, posWeight: 0 };
    a.clicks += r.clicks;
    a.impressions += r.impressions;
    a.posWeight += r.position * r.impressions;
    out.set(k, a);
  }
  return [...out.values()].map((a) => ({
    key: a.key,
    clicks: a.clicks,
    impressions: a.impressions,
    position: a.impressions ? Math.round((a.posWeight / a.impressions) * 10) / 10 : null,
  }));
}

/** Which scenario a value is closest to, and whether it is below/above the whole band. */
export function scenarioFor(value, band) {
  const [pess, exp, opt] = band;
  if (value < pess) return { label: "below-pessimistic", nearest: "pessimistic" };
  if (value > opt) return { label: "above-optimistic", nearest: "optimistic" };
  const d = { pessimistic: Math.abs(value - pess), expected: Math.abs(value - exp), optimistic: Math.abs(value - opt) };
  const nearest = Object.entries(d).sort((a, b) => a[1] - b[1])[0][0];
  return { label: nearest, nearest };
}

// ---------- URL → source file ----------

const NON_CONTENT = /^\/(account|login|signup|admin|api|search|pricing|terms|privacy|contact|about|playground)?(\/|$)/;

/**
 * Source files behind a public path, for V2 (this repo) and V1 (the live
 * site's repo, baraaabusamra/thecodefix). Follows content/data/lesson-moves.json
 * so a moved lesson maps to its new file. Returns null for non-content pages.
 */
export function sourceFor(urlPath, { moves = [], exists = fs.existsSync } = {}) {
  let p = urlPath.split(/[?#]/)[0].replace(/\/$/, "") || "/";
  const seen = new Set();
  for (let m = moves.find((x) => x.from === p); m && !seen.has(p); m = moves.find((x) => x.from === p)) {
    seen.add(p);
    p = m.to;
  }
  if (NON_CONTENT.test(p)) return null;
  let v2 = null;
  let kind = null;
  let m;
  if ((m = p.match(/^\/blog\/([^/]+)$/))) {
    kind = "blog";
    v2 = `content/ar/blog/${m[1]}.mdx`;
  } else if ((m = p.match(/^\/learn\/([^/]+)\/([^/]+)$/))) {
    kind = "lesson";
    v2 = `content/ar/tracks/${m[1]}/${m[2]}.mdx`;
  } else if ((m = p.match(/^\/learn\/([^/]+)$/))) {
    kind = "track";
    v2 = `content/ar/tracks/${m[1]}/_meta.json`;
  } else if ((m = p.match(/^\/reference\/([^/]+)(\/[^/]+)?$/))) {
    kind = "reference";
    v2 = `content/ar/reference/${m[1]}.json`;
  } else if ((m = p.match(/^\/quiz\/([^/]+)$/))) {
    kind = "quiz";
    v2 = `content/ar/quizzes/${m[1]}.json`;
  } else if ((m = p.match(/^\/roadmaps\/([^/]+)$/))) {
    kind = "roadmap";
    v2 = `content/ar/roadmaps/${m[1]}.json`;
  } else {
    return null;
  }
  const v1 = v2
    .replace(/^content\/ar\/tracks\//, "src/content/tracks/")
    .replace(/^content\/ar\/blog\//, "src/content/blog/")
    .replace(/^content\/ar\/reference\//, "src/content/reference/")
    .replace(/^content\/ar\/quizzes\//, "src/content/quizzes/")
    .replace(/^content\/ar\/roadmaps\//, "src/content/roadmaps/");
  return { path: p, kind, v2, v1, exists: exists(v2), moved: p !== (urlPath.replace(/\/$/, "") || "/") };
}

export function loadMoves(file = "content/data/lesson-moves.json") {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")).moves ?? [];
  } catch {
    return [];
  }
}

/** Prose word count of an .mdx file: frontmatter, code fences and inline code removed. */
export function proseWords(text) {
  const body = text.replace(/^---[\s\S]*?\n---\n/, "");
  const prose = body
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#>*|_\-–—:]+/g, " ");
  return (prose.match(/[\p{L}\p{N}]+/gu) ?? []).length;
}

// ---------- forecast ----------

export function loadForecast(file = FORECAST_FILE) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

/** Monthly band [pessimistic, expected, optimistic] for a week, or null if the forecast does not cover it. */
export function bandForWeek(forecast, startDate) {
  const month = weekMonth(startDate);
  const m = forecast.months?.[month];
  return m ? { month, band: [m.pessimistic, m.expected, m.optimistic] } : null;
}

// ---------- tiny CLI arg parser ----------

export function parseArgs(argv, defaults = {}) {
  const out = { ...defaults, _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      out._.push(a);
      continue;
    }
    const [k, v] = a.slice(2).split("=");
    if (v !== undefined) out[k] = v;
    else if (argv[i + 1] && !argv[i + 1].startsWith("--")) out[k] = argv[++i];
    else out[k] = true;
  }
  return out;
}

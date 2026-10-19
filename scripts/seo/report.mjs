#!/usr/bin/env node
// Weekly SEO report: actuals from docs/seo/gsc/*.json vs docs/seo/forecast.json.
//
//   node scripts/seo/report.mjs              # markdown, last 8 weeks
//   node scripts/seo/report.mjs --weeks 12
//   node scripts/seo/report.mjs --json       # machine-readable (for the skill)
//
// Deterministic: same snapshots + forecast → same report. It states which
// scenario the latest complete week is closest to; it never edits the forecast.

import {
  loadSnapshots,
  loadForecast,
  weekSummary,
  bandForWeek,
  scenarioFor,
  rows,
  aggregate,
  parseArgs,
  weekMonth,
} from "./lib.mjs";

const args = parseArgs(process.argv.slice(2), { weeks: 8 });
const N = Number(args.weeks);
const snaps = loadSnapshots();
if (!snaps.length) {
  console.error("No snapshots in docs/seo/gsc/. Collect one first (gsc-snapshot skill).");
  process.exit(1);
}
const forecast = loadForecast();
const recent = snaps.slice(-N);
const complete = snaps.filter((s) => s.complete !== false);
const latest = complete.at(-1) ?? snaps.at(-1);
const summaries = recent.map(weekSummary);

const last4 = complete.slice(-4).map(weekSummary);
const avg = (k) => (last4.length ? Math.round(last4.reduce((s, w) => s + w[k], 0) / last4.length) : null);

// The forecast is a monthly mean, so compare the month-to-date mean of complete weeks.
const fb = bandForWeek(forecast, latest.start);
const monthWeeks = complete.filter((s) => weekMonth(s.start) === weekMonth(latest.start)).map(weekSummary);
const latestDemand = Math.round(monthWeeks.reduce((s, w) => s + w.demand, 0) / monthWeeks.length);
const scenario = fb
  ? { month: fb.month, band: fb.band, month_to_date_mean: latestDemand, weeks_in_mean: monthWeeks.length, ...scenarioFor(latestDemand, fb.band) }
  : null;

// Watched pages and queries across the recent weeks.
const watchPages = forecast.watch?.pages ?? [];
const pageTrend = watchPages.map((p) => ({
  path: p,
  weeks: recent.map((s) => {
    const r = rows(s, "pages").find((x) => x.path === p);
    return r ? { week: s.week, impressions: r.impressions, clicks: r.clicks, position: r.position } : { week: s.week, impressions: 0, clicks: 0, position: null };
  }),
}));
const watchQueries = (forecast.watch?.queries ?? []).map((q) => q.query);
const queryTrend = watchQueries.map((q) => ({
  query: q,
  weeks: recent.map((s) => {
    const r = rows(s, "queries").find((x) => x.query.toLowerCase() === q.toLowerCase());
    return r ? { week: s.week, impressions: r.impressions, clicks: r.clicks, position: r.position } : { week: s.week, impressions: 0, clicks: 0, position: null };
  }),
}));

// Latest inspection per path (any snapshot that carried inspections).
const inspections = new Map();
for (const s of snaps) for (const i of s.inspections ?? []) inspections.set(i.path, { ...i, snapshot: s.week });

// New non-brand queries this week (absent from the 8 weeks before).
const prevQueries = new Set(snaps.slice(-9, -1).flatMap((s) => rows(s, "queries").map((r) => r.query)));
const newQueries = aggregate(
  rows(latest, "queries").filter((r) => r.bucket === "other" && !prevQueries.has(r.query)),
  (r) => r.query,
)
  .sort((a, b) => b.impressions - a.impressions)
  .slice(0, 10);

const out = {
  generated_from: { snapshots: snaps.length, first: snaps[0].week, last: snaps.at(-1).week, latest_complete: latest.week },
  latest: weekSummary(latest),
  avg_last4: { clicks: avg("clicks"), demand: avg("demand"), otherImpressions: avg("otherImpressions") },
  scenario,
  weeks: summaries,
  watched_pages: pageTrend,
  watched_queries: queryTrend,
  inspections: [...inspections.values()],
  new_queries: newQueries,
};

if (args.json) {
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

const fmt = (v) => (v === null || v === undefined ? "—" : String(v));
const L = [];
L.push(`# SEO weekly report — ${latest.week} (${latest.start} → ${latest.end})`);
L.push("");
if (scenario) {
  L.push(
    `**Scenario:** ${scenario.label} — ${scenario.month} month-to-date mean ${latestDemand} demand impressions/week ` +
      `(${scenario.weeks_in_mean} complete week${scenario.weeks_in_mean === 1 ? "" : "s"}) vs band ` +
      `${scenario.band[0]} / ${scenario.band[1]} / ${scenario.band[2]} (pessimistic / expected / optimistic).`,
  );
} else {
  L.push(`**Scenario:** forecast has no band for ${weekMonth(latest.start)} (pre-forecast baseline). Month-to-date mean: ${latestDemand} demand impressions/week.`);
}
if (snaps.at(-1).complete === false) L.push(`\n> ${snaps.at(-1).week} is incomplete (collected < 3 days after the week ended) and is excluded from the scenario check.`);
L.push("");
L.push("| Week | Clicks | Impressions | Demand (ex site:) | Non-brand impr | Non-brand clicks | Brand clicks | Position |");
L.push("|---|--:|--:|--:|--:|--:|--:|--:|");
for (const w of summaries) {
  L.push(`| ${w.week}${w.complete ? "" : " *"}${w.ownerCheck ? " †" : ""} | ${w.clicks} | ${w.impressions} | ${w.demand} | ${w.otherImpressions} | ${w.otherClicks} | ${w.brandClicks} | ${fmt(w.position)} |`);
}
L.push(`| **avg last 4** | ${fmt(out.avg_last4.clicks)} | | ${fmt(out.avg_last4.demand)} | ${fmt(out.avg_last4.otherImpressions)} | | | |`);
L.push("");
L.push("Non-brand impressions count only queries Google names; most impressions on a small site are anonymised, so `Demand` is the forecast metric.");
if (summaries.some((w) => w.ownerCheck)) {
  L.push("");
  L.push("† ≥ 15% of the week's impressions were the owner's own `site:` searches; those leave anonymised impressions too, so `Demand` overstates real demand that week. Read its trend with care.");
}
L.push("");
L.push("## Watched pages (impressions · position per week)");
L.push("");
L.push(`| Page | ${recent.map((s) => s.week.slice(5)).join(" | ")} |`);
L.push(`|---|${recent.map(() => "--:").join("|")}|`);
for (const p of pageTrend) {
  L.push(`| ${p.path} | ${p.weeks.map((w) => (w.impressions ? `${w.impressions} · ${w.position}` : "·")).join(" | ")} |`);
}
L.push("");
L.push("## Watched queries");
L.push("");
L.push(`| Query | ${recent.map((s) => s.week.slice(5)).join(" | ")} |`);
L.push(`|---|${recent.map(() => "--:").join("|")}|`);
for (const q of queryTrend) {
  L.push(`| ${q.query} | ${q.weeks.map((w) => (w.impressions ? `${w.impressions} · ${w.position}` : "·")).join(" | ")} |`);
}
L.push("");
L.push("## Crawl status of rewritten pages");
L.push("");
if (!inspections.size) L.push("No inspections stored yet (pass inspect paths to snapshot_week).");
else {
  L.push("| Page | Last crawl | Coverage | Canonical OK | From |");
  L.push("|---|---|---|---|---|");
  for (const i of inspections.values()) {
    L.push(`| ${i.path} | ${fmt(i.lastCrawlTime?.slice(0, 10))} | ${fmt(i.coverageState ?? i.error)} | ${i.canonicalMatches === undefined ? "—" : i.canonicalMatches ? "yes" : "NO"} | ${i.snapshot} |`);
  }
}
L.push("");
L.push("## New non-brand queries this week");
L.push("");
if (!newQueries.length) L.push("None.");
for (const q of newQueries) L.push(`- ${q.key} — ${q.impressions} impressions, position ${q.position}`);
console.log(L.join("\n"));

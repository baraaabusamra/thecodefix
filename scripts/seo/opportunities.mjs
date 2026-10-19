#!/usr/bin/env node
// Rank SEO work by evidence from docs/seo/gsc/*.json.
//
//   node scripts/seo/opportunities.mjs                  # markdown, top 25 per list
//   node scripts/seo/opportunities.mjs --recent 4 --top 40
//   node scripts/seo/opportunities.mjs --json
//
// Three lists, each tied to a decision (see .claude/skills/seo-opportunities):
//   1. striking  — page × query at position 4–20 with real impressions: the
//                  page already ranks; improving it to page 1 is the cheapest win.
//   2. decliners — pages that lost the most impressions/week vs the forecast's
//                  peak window: the drop is where the quality signal was lost.
//   3. unmatched — non-brand queries with impressions but no page above
//                  position 20: a learner need the site does not answer well
//                  (run the page-existence test before creating anything).
// Each row carries the source file (V2 path; V1 path for the live repo) and its
// prose word count, so a thin page is visible before anyone edits it.

import fs from "node:fs";
import { loadSnapshots, loadForecast, rows, aggregate, sourceFor, loadMoves, proseWords, parseArgs } from "./lib.mjs";

const args = parseArgs(process.argv.slice(2), { recent: 4, top: 25, "min-impr": 3 });
const RECENT = Number(args.recent);
const TOP = Number(args.top);
const MIN = Number(args["min-impr"]);

const snaps = loadSnapshots().filter((s) => s.complete !== false);
if (!snaps.length) {
  console.error("No complete snapshots in docs/seo/gsc/.");
  process.exit(1);
}
const forecast = loadForecast();
const moves = loadMoves();
const recent = snaps.slice(-RECENT);
const [peakFrom, peakTo] = forecast.history?.peak?.weeks ?? [];
const peak = snaps.filter((s) => peakFrom && s.week >= peakFrom && s.week <= peakTo);

const wordCache = new Map();
function describe(urlPath) {
  const src = sourceFor(urlPath, { moves });
  if (!src) return null;
  if (!wordCache.has(src.v2)) {
    wordCache.set(src.v2, src.exists && src.v2.endsWith(".mdx") ? proseWords(fs.readFileSync(src.v2, "utf8")) : null);
  }
  return { ...src, words: wordCache.get(src.v2) };
}

// 1. Striking distance.
const pq = recent.flatMap((s) => rows(s, "page_queries").map((r) => ({ ...r, bucket: null })));
const brandOrSite = new Set(recent.flatMap((s) => rows(s, "queries").filter((r) => r.bucket !== "other").map((r) => r.query)));
const striking = aggregate(
  pq.filter((r) => !brandOrSite.has(r.query) && !r.query.startsWith("site:")),
  (r) => `${r.path}\u0000${r.query}`,
)
  .map((a) => {
    const [p, query] = a.key.split("\u0000");
    return { path: p, query, clicks: a.clicks, impressions: a.impressions, position: a.position };
  })
  .filter((r) => r.position >= 4 && r.position <= 20 && r.impressions >= MIN)
  // Closer to page 1 and more impressions first: impressions × distance-to-21 weight.
  .map((r) => ({ ...r, score: Math.round(r.impressions * ((21 - r.position) / 17) * 10) / 10, src: describe(r.path) }))
  .filter((r) => r.src)
  .sort((a, b) => b.score - a.score)
  .slice(0, TOP);

// 2. Decliners: impressions/week at peak vs recent.
const perWeek = (list) => {
  const agg = aggregate(list.flatMap((s) => rows(s, "pages")), (r) => r.path);
  return new Map(agg.map((a) => [a.key, { ...a, perWeek: a.impressions / Math.max(1, list.length) }]));
};
const peakPages = perWeek(peak);
const recentPages = perWeek(recent);
const decliners = [...peakPages.values()]
  .map((p) => {
    const now = recentPages.get(p.key);
    return {
      path: p.key,
      peakPerWeek: Math.round(p.perWeek * 10) / 10,
      recentPerWeek: Math.round((now?.perWeek ?? 0) * 10) / 10,
      peakPosition: p.position,
      recentPosition: now?.position ?? null,
      lostPerWeek: Math.round((p.perWeek - (now?.perWeek ?? 0)) * 10) / 10,
      src: describe(p.key),
    };
  })
  .filter((r) => r.src && r.lostPerWeek > 0)
  .sort((a, b) => b.lostPerWeek - a.lostPerWeek)
  .slice(0, TOP);

// 3. Unmatched demand: other-bucket queries whose best page sits below position 20.
const qAgg = aggregate(recent.flatMap((s) => rows(s, "queries").filter((r) => r.bucket === "other")), (r) => r.query);
const bestPage = new Map();
for (const r of aggregate(pq, (r) => `${r.query}\u0000${r.path}`)) {
  const [query, p] = r.key.split("\u0000");
  const cur = bestPage.get(query);
  if (!cur || r.position < cur.position) bestPage.set(query, { path: p, position: r.position });
}
const unmatched = qAgg
  .filter((q) => q.impressions >= MIN && q.position > 20)
  .map((q) => ({ query: q.key, impressions: q.impressions, position: q.position, bestPage: bestPage.get(q.key) ?? null }))
  .sort((a, b) => b.impressions - a.impressions)
  .slice(0, TOP);

const out = {
  window: { recent: recent.map((s) => s.week), peak: peak.map((s) => s.week), min_impressions: MIN },
  striking,
  decliners,
  unmatched,
};

if (args.json) {
  console.log(JSON.stringify(out, null, 2));
  process.exit(0);
}

const f = (v) => (v === null || v === undefined ? "—" : String(v));
const words = (s) => (s?.words === null || s?.words === undefined ? "—" : s.words < 300 ? `**${s.words}**` : String(s.words));
const L = [];
L.push(`# SEO opportunities — recent ${recent[0].week}…${recent.at(-1).week}`);
L.push("");
L.push(`Peak window for decliners: ${peak.length ? `${peak[0].week}…${peak.at(-1).week}` : "none (forecast.history.peak missing)"}. Words in **bold** are under 300 prose words.`);
L.push("");
L.push("## 1. Striking distance (position 4–20)");
L.push("");
if (!striking.length) L.push(`None with ≥ ${MIN} impressions in the window.`);
else {
  L.push("| Score | Page | Query | Impr | Pos | Clicks | Words | File (V2) |");
  L.push("|--:|---|---|--:|--:|--:|--:|---|");
  for (const r of striking) L.push(`| ${r.score} | ${r.path} | ${r.query} | ${r.impressions} | ${r.position} | ${r.clicks} | ${words(r.src)} | \`${r.src.v2}\`${r.src.exists ? "" : " (missing)"} |`);
}
L.push("");
L.push("## 2. Biggest decliners vs peak");
L.push("");
if (!decliners.length) L.push("None.");
else {
  L.push("| Lost/wk | Page | Peak/wk · pos | Now/wk · pos | Words | File (V2) |");
  L.push("|--:|---|--:|--:|--:|---|");
  for (const r of decliners) L.push(`| ${r.lostPerWeek} | ${r.path}${r.src.moved ? ` → ${r.src.path}` : ""} | ${r.peakPerWeek} · ${f(r.peakPosition)} | ${r.recentPerWeek} · ${f(r.recentPosition)} | ${words(r.src)} | \`${r.src.v2}\`${r.src.exists ? "" : " (missing)"} |`);
}
L.push("");
L.push("## 3. Demand the site does not answer well (best position > 20)");
L.push("");
if (!unmatched.length) L.push("None.");
for (const q of unmatched) L.push(`- **${q.query}** — ${q.impressions} impressions, position ${q.position}${q.bestPage ? `; best page ${q.bestPage.path} (${q.bestPage.position})` : ""}`);
console.log(L.join("\n"));

# SEO data — `docs/seo/`

Real Search Console numbers for thecodefix.net, stored in the repo so they outlive Google's 16-month window and every report reads the same evidence.

| Path | What | Written by |
|---|---|---|
| `gsc/<YYYY>-W<ww>.json` | One Mon–Sun week from the URL-prefix property `https://thecodefix.net/` (schema 1) | `gsc-snapshot` skill → `scripts/seo/gsc_collect.py` |
| `forecast.json` | Scenario bands (pessimistic / expected / optimistic) per month, assumptions, watch lists, revision log | written by hand; revised via the `seo-forecast` skill |

## Commands

```bash
npm run seo:report          # actuals vs forecast, watched pages/queries, crawl status
npm run seo:opportunities   # striking distance, decliners vs peak, unmatched demand
npm run check:seo-data      # validates every snapshot + the forecast (part of check:all)
```

## Rules

- Numbers come only from snapshot files. A missing week is reported as missing, never estimated (same rule as `docs/seo-baseline-template.md`).
- Snapshots are byte-exact copies of the collector output, proven by sha256 (`check-snapshots.mjs --sha`).
- Past forecast bands are never edited to fit the actuals; revisions are appended to `forecast.json → revisions`.
- Collecting is read-only on Google's side. Sitemap submission and indexing requests need the owner's explicit approval.

## History notes

- **2026-W26 → W41** were backfilled on 2026-10-19 with trimmed rows (≥ 2 impressions; top 100 pages / 120 queries / 150 page×query). Totals and counts are exact.
- **2026-W34** is the drop: impressions 2,106 → 161 in one week, position ~14 → ~45, while pages stayed indexed.
- **2026-W39** demand is inflated by owner `site:` checks; the `site` bucket separates them.

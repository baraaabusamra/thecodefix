---
name: seo-forecast
description: Compare thecodefix.net's real Search Console numbers with the written forecast (docs/seo/forecast.json), say which scenario the site is tracking, check the leading indicators, and revise the forecast honestly when the evidence says so. Use for the weekly SEO check, "وين صرنا بالتوقّع", "كيف ماشي الموقع", "حدّث التوقّع", or any traffic prediction question.
---

# SEO forecast — scenarios checked against actuals

The forecast is a set of **written scenario bands made before the data arrives** (`docs/seo/forecast.json`). This skill checks them against stored data and revises them in the open. It does not fit a statistical model: with months of history and one regime change (the −90% drop in week 2026-W34), a model would give precise-looking numbers with no real basis. Say that if asked for "an AI prediction".

## 1. Make sure the data is current

`ls docs/seo/gsc/` — if the last complete week (Mon–Sun that ended ≥ 3 days ago) is missing, run `gsc-snapshot` first. With the weekly run, pass `forecast.json → watch.inspect` as `inspect_paths` so crawl dates are fresh.

## 2. Run the report

```bash
npm run seo:report            # markdown: last 8 weeks, scenario, watched pages/queries, crawl status
node scripts/seo/report.mjs --json
```

What it computes (deterministic, read it rather than re-deriving):

- **Metric** = demand impressions per week = total impressions − `site:` impressions. The band for a month is compared with the **month-to-date mean** of complete weeks (a week belongs to the month of its Thursday).
- **Scenario** = nearest of pessimistic / expected / optimistic, or below/above the whole band.
- Watched pages and queries per week; latest URL Inspection per watched URL; new named non-brand queries.

## 3. Interpret — in this order

1. **Data quality first.** Incomplete week? `site:` spike (owner checks inflate totals — e.g. 2026-W39)? Say it before any conclusion.
2. **Leading indicators** (they move weeks before clicks): rewritten pages crawled after their rewrite date; watched posts' position on their own queries moving under 20; named non-brand impressions rising.
3. **Scenario** with the month-to-date number and the band. One noisy week is not a trend; call a trend after 3 consecutive weeks on the same side.
4. **External cause:** for a sharp move, search the web for a Google core/spam update in that window and name it with a source; otherwise say none was found.
5. **One or two concrete actions**, taken from `seo-opportunities`, not general SEO advice.

## 4. Revising the forecast

Revise only when (a) 3+ consecutive complete weeks fall outside the band, (b) an assumption in `assumptions` turned false (e.g. the PR wasn't merged, a core update happened), or (c) the owner asks.

- **Never edit a past month's band to fit what happened.** Change only current and future months, and append to `revisions`:

  ```json
  { "date": "2027-01-06", "reason": "3 weeks above optimistic after the December core update", "changed": { "2027-02": { "from": [200, 900, 1700], "to": [600, 1400, 2400] } } }
  ```

- Keep `pessimistic ≤ expected ≤ optimistic`; `npm run check:seo-data` enforces it.
- Commit the revision on its own: `data(seo): forecast revision <date> — <reason>`.

## 5. Reporting to the owner

The owner reads Arabic (Jordanian dialect is fine). Keep it short:

1. One line: which scenario, with the number vs the band.
2. A small table: this week vs last week vs 4-week average (clicks, demand impressions, non-brand impressions, position).
3. Watched posts that moved; crawl status of rewritten pages.
4. One or two actions for next week.

State uncertainty plainly: these are ranges with written assumptions, not promises; Google's re-evaluation timing is the biggest unknown and nobody controls it.

## Never

- Submit sitemaps, request indexing or change Search Console settings without the owner's explicit yes in the conversation.
- Report a number that is not in a snapshot file or the report output.
- Treat clicks from brand searches as SEO growth.

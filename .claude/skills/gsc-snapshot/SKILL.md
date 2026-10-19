---
name: gsc-snapshot
description: Pull one week of Google Search Console data for thecodefix.net into the repo (docs/seo/gsc/<YYYY>-W<ww>.json) so SEO history survives GSC's 16-month window and every forecast or report reads the same numbers. Use weekly, before seo-forecast or seo-opportunities, or for "اسحب بيانات Search Console", "حدّث بيانات SEO".
---

# GSC snapshot — one week of real data into the repo

Everything downstream (`seo-forecast`, `seo-opportunities`, `npm run seo:report`) reads only `docs/seo/gsc/*.json`. No file, no claim: if a week is missing, say so; never estimate it.

**Read-only on Google's side.** The collector calls only `GOOGLE_SEARCH_CONSOLE_SEARCH_ANALYTICS_QUERY` and `GOOGLE_SEARCH_CONSOLE_INSPECT_URL`. Never submit a sitemap, request indexing or change a GSC setting from this skill — those need the owner's explicit yes in the conversation.

## 1. Connection

Search Console is reached through the Composio connector (`composio_for_you`), account `google_search_console_bestay-slob`. Check it with `COMPOSIO_SEARCH_TOOLS` (query: "query Google Search Console search analytics"); if `has_active_connection` is false, ask the owner to reconnect and stop.

Property: **`https://thecodefix.net/`** (URL-prefix; history from 2026-06-20). `sc-domain:thecodefix.net` only has data from 2026-09-17 — don't mix the two.

## 2. Pick the week

Weeks are Mon–Sun (ISO). GSC lags 2–3 days, so collect the week that ended **at least 3 days ago** (`last_complete_monday()` in the collector). On a Wednesday that is last week. A snapshot taken earlier gets `"complete": false`; re-collect it later and overwrite.

Find the gap: `ls docs/seo/gsc/` and collect every missing complete week, oldest first.

## 3. Collect in the workbench

1. Read `scripts/seo/gsc_collect.py` and pass its full text as one `COMPOSIO_REMOTE_WORKBENCH` cell (it only defines functions).
2. Second cell:

   ```python
   m = last_complete_monday()            # or an explicit Monday, "2026-10-12"
   paths = [...]                         # docs/seo/forecast.json → watch.inspect (≤ 15: URL Inspection is rate-limited)
   text, sha = snapshot_week(m, inspect_paths=paths)
   print(sha); print(text, end="")
   ```

   Inspect only on the live weekly run, not when backfilling old weeks (crawl state is "now", not "that week").

## 4. Save it locally — byte-exact

The workbench can't hand files to this machine, so the text travels through the conversation. That is safe only because the sha proves the copy:

1. Write the printed text **exactly** (no reformatting, keep the trailing newline) to `docs/seo/gsc/<week>.json` with the Write tool.
2. `node scripts/seo/check-snapshots.mjs --sha <sha> docs/seo/gsc/<week>.json`
3. Mismatch → a byte changed. Copy it again from the workbench output; never "fix" numbers by hand.

## 5. Commit

```bash
npm run check:seo-data
git add docs/seo/gsc/ && git commit -m "data(seo): GSC snapshot <week>"
```

Data commits carry no content changes, so they never mix with lesson or blog edits.

## File format (schema 1)

One top-level key per line, one table row per line (diff-friendly). Tables are arrays whose meaning is in `columns`:

| Key | What |
|---|---|
| `totals` | clicks, impressions, impression-weighted position for the week (date dimension — matches the GSC chart) |
| `buckets` | `brand` (thecodefix / the code fix / كود فكس), `site` (`site:` owner checks), `other` (named non-brand demand), `anonymized_impressions` (total minus named queries — most of a small site's impressions) |
| `counts` | rows GSC returned before trimming |
| `trim` | limits used; the 2026-06-22…2026-10-05 backfill kept rows with ≥ 2 impressions, top 100 pages / 120 queries / 150 page×query |
| `daily`, `pages`, `queries`, `page_queries` | the rows; paths are site-relative (`/blog/x`) |
| `inspections` | `lastCrawlTime`, `coverageState`, `verdict`, `canonicalMatches` for the watched URLs |

Totals and counts are exact even when rows are trimmed.

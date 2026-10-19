---
name: seo-opportunities
description: Rank what to work on next for thecodefix.net's search traffic from stored Search Console data — pages one push from page 1, pages that lost the most since the peak, and searches the site does not answer — each with its source file and word count. Use before choosing which lessons or blog posts to rewrite, for "شو أشتغل بعدين", "أولويات SEO", "striking distance", or after a weekly snapshot.
---

# SEO opportunities — evidence-ranked work list

Turns `docs/seo/gsc/*.json` (see `gsc-snapshot`) into a ranked list. It decides **which page to look at**, never **what to write**: every edit still goes through `docs/content-guidelines.md` and `docs/seo-technical-policy.md`.

## 1. Run

```bash
npm run seo:opportunities                       # last 4 complete weeks, top 25 per list
node scripts/seo/opportunities.mjs --recent 8   # wider window when weekly numbers are tiny
node scripts/seo/opportunities.mjs --json       # for further processing
```

If the newest snapshot is more than 10 days old, run `gsc-snapshot` first and say so.

## 2. Read each list as a decision

| List | Means | Do |
|---|---|---|
| **1. Striking distance** (page × query at position 4–20) | Google already ranks this page for this search; it is near page 1. | Open the page and the query together. Does the page answer *that* query in its first screen? Fix the gap (definition up front, the exact error message, the missing case). Change `seoTitle`/`description` only if they don't describe what the page really covers. |
| **2. Decliners** (impressions/week lost vs the peak window in `forecast.json`) | Where the August 2026 quality drop actually landed. | Rewrite in order of `Lost/wk`. A **bold** word count (< 300) is the usual reason — deepen with what a learner needs, verified (guidelines §10–§12), or merge into a stronger page with a 301. |
| **3. Unmatched demand** (named query, best page > position 20) | A real search the site does not answer well. | Run the page-existence test (guidelines §7) *before* anything else. Usually the answer is to extend the closest existing page, not a new URL. |

The score in list 1 is `impressions × (21 − position) / 17` — a ranking aid, not a traffic prediction. Don't report it as "expected clicks".

## 3. Rules

- **Small numbers are noisy.** With a few impressions per page per week, one week means little — prefer `--recent 8` and say how many impressions a row rests on.
- **The live site is V1.** Rows show the V2 path (`content/ar/...`); the same file in the live repo is the `v1` path in `--json` (`src/content/...`). Edit where the work is being done for the current release and port it (`npm run port-branch`).
- `(missing)` next to a file means the URL has no source here. The script follows `content/data/lesson-moves.json` only; blog and other merges live in `redirects()` in `apps/web/next.config.ts` (e.g. `/blog/cors-error` → `/blog/cors-error-fix`). Credit the loss to the redirect target; if there is no redirect either, that is a live 404 to fix first (`npm run check:lesson-redirects`, seo-technical-policy §4).
- Word counts come from this repo. Until V1 work is ported (`npm run port-branch`), a page rewritten on V1 still shows its old count here.
- Brand and `site:` queries are excluded from every list.
- Never pad a page to raise its word count (guidelines §19); never create a page because a query exists (§30).

## 4. Report back

For each item you act on: the page, the query or loss that justified it, what you changed, and how it was verified. Items you skip: one line why (e.g. "intent is navigational", "covered by X").

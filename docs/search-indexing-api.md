# Google Indexing API — job pages

Automates asking Google to (re)crawl our **job-posting pages** (`/jobs/[slug]`)
via the [Web Search Indexing API](https://developers.google.com/search/apis/indexing-api/v3/quickstart).

## ⚠️ Scope — read first

Google's Indexing API is **officially only for `JobPosting` and `BroadcastEvent`
pages.** Our `/jobs/[slug]` pages emit `JobPosting` JSON-LD, so this is a
compliant use. **Do not** point this at lessons or blog posts — those get
discovered through `sitemap.xml` + manual "Request Indexing" in Search Console.

- Trigger crawl of job pages → this script (compliant).
- Get lessons/articles indexed → sitemap + Search Console URL Inspection.
- Just *check* if a page is indexed (any page) → URL Inspection API (read-only).

## One-time setup

### 1. Service account (Google Cloud Console)

Reuse the existing project (the one with the Google OAuth client).

1. **APIs & Services → Library** → enable **Web Search Indexing API**.
2. **IAM & Admin → Service Accounts → Create service account**
   - Name: `search-indexer`. No IAM roles needed.
3. Open the account → **Keys → Add key → Create new key → JSON** → download.
   - This file is a **secret credential**. It is git-ignored (`*-key.json`,
     `*service-account*.json`, `gcp-*.json`). Never commit it.

### 2. Grant access in Search Console

1. Copy the `client_email` from the JSON key
   (`search-indexer@<project>.iam.gserviceaccount.com`).
2. Search Console → `thecodefix.net` property → **Settings → Users and
   permissions → Add user** → paste that email → permission **Owner**
   (the Indexing API requires Owner; Full is not enough).

### 3. Point the script at the key

Local dev — add to `.env`:

```
GOOGLE_INDEXING_KEY_FILE=./search-indexer-key.json
```

CI / Vercel — paste the whole JSON as a secret env var instead:

```
GOOGLE_INDEXING_KEY={"type":"service_account", ... }
```

## Usage

```bash
# Preview the URLs it would notify (no credentials needed):
npm run notify-index -- --dry-run

# Actually notify Google (needs the key configured):
npm run notify-index
```

- Reads every `src/content/jobs/*.json`, builds `${SITE_URL}/jobs/<slug>`, and
  sends a `URL_UPDATED` notification for each.
- Base URL comes from `NEXT_PUBLIC_SITE_URL` (falls back to
  `https://thecodefix.net`).
- Run it **after adding or editing a job posting.**

## Notes & limits

- Default quota: **200 URLs/day**, 600 requests/minute.
- No new npm dependencies — auth is a service-account JWT signed with Node's
  built-in `crypto`.
- To also **delete** a removed job from the index, the API supports
  `type: "URL_DELETED"` (not wired up here — add if you start removing jobs).
- Implementation: `scripts/notify-index.mjs`.

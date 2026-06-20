# Deploying The Code Fix to Vercel

This is a standard Next.js 16 app — Vercel auto-detects everything. No `vercel.json` needed.

## Option A — Vercel CLI (fastest)

Run these in this project folder. In Claude Code you can prefix each with `!` to run it here.

```bash
# 1. Install the CLI (once)
npm i -g vercel

# 2. Log in (opens the browser)
vercel login

# 3. Deploy a preview build
vercel

# 4. Promote to production
vercel --prod
```

During the first `vercel` run, accept the detected defaults:
- Framework: **Next.js**
- Build command: `next build`
- Output: (auto)

## Option B — GitHub + Vercel dashboard (best for ongoing work)

1. Push this folder to a GitHub repo.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo.
3. Vercel detects Next.js; click **Deploy**.
4. Every push to `main` then auto-deploys.

## Required environment variable

Set this in **Vercel → Project → Settings → Environment Variables** (and locally in `.env.local`):

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SITE_URL` | Your production URL, e.g. `https://ar.thecodefix.com` |

This drives canonical URLs, `sitemap.xml`, `robots.txt`, and OpenGraph tags. If unset, it falls back to `https://ar.thecodefix.com`.

## Custom domain

Vercel → Project → **Settings → Domains** → add `ar.thecodefix.com`, then point your DNS:
- Add a `CNAME` for `ar` → `cname.vercel-dns.com` (Vercel shows the exact target).

## After it's live (start the SEO flywheel)

1. Verify the site in [Google Search Console](https://search.google.com/search-console).
2. Submit `https://<your-domain>/sitemap.xml`.
3. Confirm `https://<your-domain>/robots.txt` resolves.

## Local production check

```bash
npm run build && npm run start   # serves the production build on :3000
```

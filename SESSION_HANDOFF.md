# The Code Fix — Session Handoff

> **How to use this:** Next time you start Claude, say:
> _"Read SESSION_HANDOFF.md to understand where we ended."_
> Last updated: **2026-06-21**

---

## What this project is
- **The Code Fix** — an Arabic (RTL) programming education platform, W3Schools-style.
- Live at **https://thecodefix.net** (custom GoDaddy domain).
- Stack: **Next.js 16** (App Router, Turbopack — NOTE: modified Next.js, read `node_modules/next/dist/docs/` before using APIs), React 19, TypeScript, Tailwind v4, MDX content.
- DB/Auth: **Neon Postgres + Drizzle ORM**, **Auth.js (next-auth v5)** with GitHub + Google OAuth, role-based admin panel.
- Hosting: **Vercel**. Deploy with `vercel deploy --prod --yes` (git auto-deploy is unreliable).

## Working agreement
- I work **autonomously** on content/build tasks — you gave full standing permission, don't need to re-ask.
- Workflow for any change: edit → `npm run build` (must stay static/no errors) → commit → `git push` → `vercel deploy --prod --yes`.
- Commit messages end with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

---

## ✅ Last task completed (this session)
**Playground now supports HTML/CSS, JavaScript, and Python ONLY** (no compiler for other languages).
- `src/components/Playground.tsx`: added `"python"` mode using **Pyodide** (Python→WASM, lazy-loaded from CDN, cached in ref). stdout/stderr stream to the console panel. Header "🐍 محرّر بايثون", loading label "...جارٍ تحميل بايثون". JS runner iframe only renders in JS mode.
- `src/app/playground/page.tsx`: 3 tabs now (JavaScript / HTML·CSS / Python) via `?mode=python`, with `DEFAULT_PYTHON` snippet + per-mode descriptions.
- Built clean, committed (`2e09497`), pushed, deployed to production.
- Note: Python's first run downloads ~6MB Pyodide WASM (one-time per session), then instant.

---

## ⏳ Open / pending (not code — waiting on Google)
- **Google "deceptive site" security flag** review is still PENDING. Don't promote the site widely until it clears.
  - Root cause was fixed: cybersecurity lesson `01-threats.mdx` had live malicious sample code — sanitized.
  - Remaining flag is likely a false positive (new domain / login page). Just needs time (days–~2 weeks). Re-check Search Console → Security Issues.

## Status notes
- SEO: self-referencing canonicals fixed across homepage/lessons/tracks/blog/jobs/roadmaps (earlier global-canonical bug removed).
- Indexing growing (~30–40 pages). Real traffic confirmed (Facebook, Instagram, Google search).
- 93+ lessons across HTML, CSS, JavaScript, React, etc. 9 roadmaps. Quizzes per track.

---

## Key files / locations
- Content: `src/content/tracks/*/*.mdx` + `_meta.json`; roadmaps `src/content/roadmaps/*.json`
- Playground: `src/components/Playground.tsx`, `src/app/playground/page.tsx`
- Auth/RBAC: `src/lib/rbac.ts`, `src/lib/flags.ts`; site config `src/lib/site.ts`
- Header/nav: `src/components/Header.tsx`, `SubjectsBar.tsx`, `AuthButton.tsx`
- Login page: `src/app/login/page.tsx`

## Possible next ideas (not yet requested)
- Embed the Python playground in Python lessons.
- More Python lesson content now that the compiler exists.
- Keep monitoring the security-flag review.

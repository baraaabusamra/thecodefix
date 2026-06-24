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
**Full A-Z Python course built** — extended the `python` track from 7 → 26 lessons.
- Added 19 comprehensive Arabic lessons `07-25` consolidating the W3Schools Python syllabus (skipped reference/platform pages per content policy): syntax/comments, data types & casting, operators, output/input/f-strings, tuples, sets, dictionaries, match, lambda/range/*args, modules & pip, dates/math/random, JSON, regex, try/except, file handling, OOP basics, OOP advanced, libraries overview (NumPy/Pandas/ML/Django/DSA survey), and summary.
- **Python playground embedded** (`<Playground mode="python" initialCode={...} />`) in key interactive lessons (data-types, operators, output-input, sets, dictionaries, match, lambda, dates, json, regex, exceptions, oop) — this was the previously-suggested "embed Python playground in lessons" idea.
- Fixed old `06-lists.mdx` footer (it said "you finished the basics" — now points to lesson 07).
- Built clean (lesson pages stayed SSG ●), committed (`ecaaa70`), pushed, deployed to production (`dpl_36bbcnbGWKyRC9nc13qenrUGZcuc`).

### Previous task
Playground gained Python mode via Pyodide (commit `2e09497`). 3 tabs at `/playground` (JS / HTML·CSS / Python). First Python run downloads ~6MB WASM once per session.

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

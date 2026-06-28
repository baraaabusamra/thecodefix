# The Code Fix — Session Handoff

> **How to use this:** Next time you start Claude, say:
> _"Read SESSION_HANDOFF.md to understand where we ended."_
> Last updated: **2026-06-27**

---

## ✅✅ TASK COMPLETE (2026-06-28): ALL 31 TRACKS ARE FULL A-Z COURSES

**Every track now has 20–26 lessons + a 15-question quiz. The "complete all tracks" task is DONE.**
Completed across sessions incl. this one: C, Git, Docker, DSA, Next.js, Linux, Rust, Kotlin,
Swift, MongoDB, Tailwind, REST APIs, OOP, Networking, Django, Flutter, Cybersecurity (+ C++ quiz).
Earlier: HTML, CSS, JS, React, Python, TS, Node, PHP, Laravel, SQL, Java, Go, C#.
Audit: all 31 tracks L≥20, all quizzes Q=15 (sql 16). Builds fully static, all deployed to prod.

**Next per user-approved order:** admin power features → more site UX/design → SEO for #1 Arabic.
(English/i18n DEFERRED by user — stay Arabic-first.)
Cybersecurity content kept strictly defensive (no live payloads) per earlier Google flag history.

## 🗄️ (historical) ACTIVE TASK (2026-06-26): "Complete everything" — expand ALL tracks to full A-Z courses

User asked to complete every incomplete track into a full ~25-lesson A-Z course
(same pattern as HTML/CSS/JS/React/Python/TS/Node/PHP/Laravel/C++) + expand each
quiz from 5 → 15 questions. Work one track at a time: build → commit → push →
`vercel deploy --prod --yes`. Standing autonomous permission — don't re-ask.

**DONE this task:** ✅ SQL ✅ Java ✅ Go ✅ csharp ✅ **C** ✅ **Git** ✅ **Docker** ✅ **DSA**
✅ **Next.js** ✅ **Linux** ✅ **Rust** ✅ **Kotlin** ✅ **Swift** — all 25 lessons + 15q quiz. Also ✅ **cpp quiz**→15q.

**REMAINING tracks to expand (current lesson count):**
- [ ] mongodb (3)  [ ] tailwind (3)
- [ ] cybersecurity (3)  [ ] rest-api (3)  [ ] oop (2)
- [ ] django (5)  [ ] flutter (5)  [ ] networking (5)

⚠️ MDX gotcha: raw `<T>` / `<Tag>` in **headings or prose** breaks the build (parsed as JSX).
Wrap generics/angle-brackets in backticks outside code fences (hit this on rust 21).

**Then (user-approved order):** admin power features → more site UX/design → SEO for #1 Arabic.
**English/i18n: DEFERRED** by user (stay Arabic-first).

**Quizzes still 5q (expand to 15 when track gets A-Z lessons):** all of the above
+ cpp (track already 25 lessons but quiz still 5q — expand it too).

**Per-track recipe:** keep existing 00-NN lessons, fix the LAST old lesson's
footer (replace "🎉 أكملت..." with "🎯 التالي: …"), add new lessons up to 24,
each: frontmatter (title/description/order/keywords), `##` headings, backtick
inline code, fenced code blocks, a "أخطاء شائعة" or 💡 tip, and a `> 🎯 التالي:`
footer (summary lesson links to next track + quiz). Validate quiz JSON with
python json.load before building. Build needs Neon reachable (transient fetch
errors → just retry `npm run build`).

---

---

## ✨ UX FEATURE PUSH (2026-06-27) — DEPLOYED

User asked to "complete everything / add every function that helps a user." Built a
batch of learner-experience features (all client-side / static-safe, on-brand neon+RTL),
deployed to prod (`dpl_EqN9tCxfkU44XMZkeYCFhYTq2iR1`, commits `e623d0a`, `87ce7e0`, `6ec3cdc`):

- **⌘K / Ctrl+K command palette** — instant client search over every lesson + key pages
  (`CommandPalette.tsx` server-builds the index → `CommandPaletteClient.tsx`; header search
  box now opens it via `tcf:open-search` event, `SearchTrigger.tsx`).
- **Copy button on every code block** (`CodeBlock.tsx`, registered as MDX `pre`).
- **Reading aids on lessons:** top reading-progress bar (`ReadingProgress.tsx`),
  "في هذه الصفحة" TOC (`OnThisPage.tsx`, DOM-based, xl 3rd column), reading-time + "الدرس N من M".
- **Bookmarks** (`lib/bookmarks.ts` localStorage) — `BookmarkButton.tsx` on lessons, listed in account.
- **Continue where you left off** — `lib/recent.ts` + `RecordVisit.tsx` record last lesson;
  `ContinueLearning.tsx` resume banner on homepage.
- **Keyboard lesson nav** (`LessonKeyNav.tsx`, RTL: ←=next, →=prev, ignores inputs).
- **Share button** (`ShareButton.tsx`, native share + clipboard fallback).
- **Scroll-to-top** button, **smooth anchor scroll**, branded **404** (`not-found.tsx`).
- **PWA manifest** (`app/manifest.ts`, installable, RTL) + **theme-color** + a11y **skip-to-content** link.

Build stayed fully static (all 408 lesson pages ●). Verified live: homepage 200, manifest serving.

**Still open (carried over): expand remaining tracks to full A-Z courses** (see list below) —
csharp/c/docker/dsa/rust/kotlin/swift/linux/mongodb/tailwind/cybersecurity/rest-api/oop/
django/flutter/networking/nextjs/git, + bring their quizzes to 15q.

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

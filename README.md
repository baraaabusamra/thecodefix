# The Code Fix — المرجع العربي الأول للبرمجة

Phase 5 of the [Strategic Roadmap](./docs/) — the "Arabic W3Schools" platform.
An Arabic-first (RTL), SEO-optimized, interactive programming documentation site.

🔗 **Live:** https://thecodefix.net · **Deploys:** automatic on push to `main` (Vercel ↔ GitHub).

## 🗺️ V2 — monorepo

![خريطة المشروع](./docs/project-map/FLOOR.svg)

The codebase is organised like a mall map: **zones** (packages) holding **shops**
(folders). Every package has a `README.md` with a red "you are here" pin on this
map (`MAP.svg`), what it contains, what it depends on and who uses it.

```
apps/web/        the Next.js site — routes, shell, /api/v1 for mobile (URLs unchanged from V1)
modules/*        features: learning, progress, assessment, certificates, billing,
                 creators, academic, jobs, feedback, media, admin
packages/*       foundations: core, db, identity, content, observability, ui, contracts
content/ar/…     lessons, posts, reference, quizzes (content/<locale> per language)
content/data/…   locale-neutral factual data (universities, lesson dates)
scripts/  tests/ checks, the map/audit tools, V2 tooling
docs/v2/         architecture, decisions (ADRs), migration, security, deployment, roadmap
```

📐 **Start here:** [`docs/v2/ARCHITECTURE.md`](./docs/v2/ARCHITECTURE.md) — the map,
the three layers, the seven enforced rules and "where does my code go?".
Every V1 file's new home: [`docs/v2/MIGRATION.md`](./docs/v2/MIGRATION.md).
V1's architecture document is kept at [`docs/v1/ARCHITECTURE.md`](./docs/v1/ARCHITECTURE.md).
**Site architecture** (routes, internal linking, SEO) is
[`docs/site-architecture.md`](./docs/site-architecture.md).

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **npm workspaces + Turborepo** (Just-in-Time internal packages, no build step per package)
- **Tailwind CSS v4** + `@tailwindcss/typography`
- **MDX** content (`next-mdx-remote/rsc`, `gray-matter`) read through `@tcf/content`
- **Neon Postgres + Drizzle** (`@tcf/db`; atomic writes via `@tcf/db/transaction`)
- Arabic font: **Cairo** · code font: **JetBrains Mono**

## Brand

Neon Purple `#B026FF` + Electric Cyan `#00F5FF`. Dark theme is the signature look;
light theme available via the header toggle (no-flash, persisted to `localStorage`).

### Adding a lesson

1. Create `content/ar/tracks/<tech>/NN-slug.mdx` with frontmatter:
   ```yaml
   ---
   title: "..."
   description: "..."      # used for SEO meta
   order: 1
   keywords: ["...", "..."]
   ---
   ```
2. For a new track, add `content/ar/tracks/<tech>/_meta.json`
   (`title`, `description`, `icon`, `color`).

Pages, sitemap, and search pick it up automatically.

## Develop

```bash
npm install          # links every workspace package
npm run dev          # http://localhost:3000 (turbo → apps/web)
npm run build        # production build
npm run typecheck && npm run lint && npm test && npm run check:all
npm run map          # scan + redraw the project map and every package's "you are here"
node scripts/audit/where.mjs <file>   # where is this file, what uses it
npm run new-module <name> "<وصف>"     # scaffold a new feature module
```

## Roadmap (build milestones)

- [x] **M0** Foundation — RTL/Arabic, neon theme, dark/light toggle, layout
- [x] **M1** Docs MVP — MDX engine, JavaScript track, SEO meta + sitemap
- [x] **SEO structured data (JSON-LD)** — Organization + WebSite (SearchAction) site-wide, `Course` on track pages, `LearningResource` + `BreadcrumbList` on lessons (`packages/ui/src/ui/JsonLd.tsx`)
- [x] **Blog** — MDX posts (`content/ar/blog/*.mdx`, `packages/content/src/blog.ts`) at `/blog` + `/blog/[slug]`, with `BlogPosting` JSON-LD and sitemap entries; targets long-tail Arabic keywords. 3 seed posts.
- [x] **M3 (partial)** Search over lessons
- [x] **M2** Monaco interactive playground — `/playground` (shareable links, JS + HTML/CSS tabs) + `<Playground />` embeddable in lessons. JS runs in a sandboxed iframe with captured console output; `mode="html"` gives a live HTML/CSS preview (debounced). Embedded in HTML/CSS lessons (text, box-model, flexbox).
- [ ] **M3** Algolia/Meilisearch instant search
- [x] **M4 (local-first)** Quizzes (`/quiz/[tech]`, data in `content/ar/quizzes/*.json`), progress tracking + lesson "mark complete" + sidebar checkmarks, account dashboard (`/account`) with progress bars, and printable certificates (`/certificate/[tech]`) earned at ≥60%. State persists in `localStorage` via `modules/progress/src/progress.ts` — swap that module for a real auth/DB backend later; UI/quiz engine stay unchanged.
- [x] **M4 (server)** Real auth (Auth.js v5 + Drizzle adapter, GitHub/Google OAuth, RBAC) — built and wired, but stays dormant until `AUTH_SECRET` + a provider ID are set (see `packages/core/src/flags.ts`, `SETUP.md`).
- [x] **M5 (partial)** Pro subscription — Stripe integration is wired (checkout, webhook, RBAC gating); dormant until `STRIPE_SECRET_KEY`/`STRIPE_PRO_PRICE_ID` are set (see `SETUP.md`). Job board is live at `/jobs` (Jooble-backed listings, no gating).
- [x] **M6** Content tracks — **51 tracks** across languages, frameworks, cloud/DevOps, CS fundamentals, and security = **1,160+ lessons**. Full list lives in `content/ar/tracks/`, not enumerated here to avoid this file going stale again.

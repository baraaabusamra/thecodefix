# The Code Fix — المرجع العربي الأول للبرمجة

Phase 5 of the [Strategic Roadmap](./docs/) — the "Arabic W3Schools" platform.
An Arabic-first (RTL), SEO-optimized, interactive programming documentation site.

🔗 **Live:** https://thecodefix.net · **Deploys:** automatic on push to `main` (Vercel ↔ GitHub).

## Stack

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4** + `@tailwindcss/typography`
- **MDX** content (`next-mdx-remote/rsc`, `gray-matter`)
- Syntax highlighting via `rehype-highlight`
- Arabic font: **Cairo** · code font: **JetBrains Mono**

## Brand

Neon Purple `#B026FF` + Electric Cyan `#00F5FF`. Dark theme is the signature look;
light theme available via the header toggle (no-flash, persisted to `localStorage`).

## Project structure

```
src/
  app/
    layout.tsx              # RTL <html lang="ar">, fonts, theme script, header/footer
    page.tsx                # homepage: search-first hero + tracks grid
    learn/page.tsx          # all tracks
    learn/[tech]/page.tsx   # track landing (lesson list)
    learn/[tech]/[lesson]/  # lesson page: sidebar + MDX + prev/next
    search/page.tsx         # full-text-ish search over lessons
    pricing/ jobs/ playground/   # tiers + stubs for later milestones
    sitemap.ts robots.ts    # SEO
  components/               # Header, Footer, Sidebar, ThemeToggle, Mdx, UserMenu
  content/tracks/<tech>/    # _meta.json + NN-slug.mdx lessons (with frontmatter)
  lib/content.ts            # filesystem content API (tracks, lessons, search)
```

### Adding a lesson

1. Create `src/content/tracks/<tech>/NN-slug.mdx` with frontmatter:
   ```yaml
   ---
   title: "..."
   description: "..."      # used for SEO meta
   order: 1
   keywords: ["...", "..."]
   ---
   ```
2. For a new track, add `src/content/tracks/<tech>/_meta.json`
   (`title`, `description`, `icon`, `color`).

Pages, sitemap, and search pick it up automatically.

## Develop

```bash
npm run dev      # http://localhost:3000
npm run build    # production build
npm run start    # serve production build
```

## Roadmap (build milestones)

- [x] **M0** Foundation — RTL/Arabic, neon theme, dark/light toggle, layout
- [x] **M1** Docs MVP — MDX engine, JavaScript track, SEO meta + sitemap
- [x] **SEO structured data (JSON-LD)** — Organization + WebSite (SearchAction) site-wide, `Course` on track pages, `LearningResource` + `BreadcrumbList` on lessons (`src/components/JsonLd.tsx`)
- [x] **Blog** — MDX posts (`src/content/blog/*.mdx`, `src/lib/blog.ts`) at `/blog` + `/blog/[slug]`, with `BlogPosting` JSON-LD and sitemap entries; targets long-tail Arabic keywords. 3 seed posts.
- [x] **M3 (partial)** Search over lessons
- [x] **M2** Monaco interactive playground — `/playground` (shareable links, JS + HTML/CSS tabs) + `<Playground />` embeddable in lessons. JS runs in a sandboxed iframe with captured console output; `mode="html"` gives a live HTML/CSS preview (debounced). Embedded in HTML/CSS lessons (text, box-model, flexbox).
- [ ] **M3** Algolia/Meilisearch instant search
- [x] **M4 (local-first)** Quizzes (`/quiz/[tech]`, data in `src/content/quizzes/*.json`), progress tracking + lesson "mark complete" + sidebar checkmarks, account dashboard (`/account`) with progress bars, and printable certificates (`/certificate/[tech]`) earned at ≥60%. State persists in `localStorage` via `src/lib/progress.ts` — swap that module for a real auth/DB backend later; UI/quiz engine stay unchanged.
- [x] **M4 (server)** Real auth (Auth.js v5 + Drizzle adapter, GitHub/Google OAuth, RBAC) — built and wired, but stays dormant until `AUTH_SECRET` + a provider ID are set (see `src/lib/flags.ts`, `SETUP.md`).
- [x] **M5 (partial)** Pro subscription — Stripe integration is wired (checkout, webhook, RBAC gating); dormant until `STRIPE_SECRET_KEY`/`STRIPE_PRO_PRICE_ID` are set (see `SETUP.md`). Job board is live at `/jobs` (Jooble-backed listings, no gating).
- [x] **M6** Content tracks — **51 tracks** across languages, frameworks, cloud/DevOps, CS fundamentals, and security = **1,160+ lessons**. Full list lives in `src/content/tracks/`, not enumerated here to avoid this file going stale again.

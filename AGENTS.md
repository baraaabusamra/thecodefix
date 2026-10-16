# V2 monorepo — read before touching code

This repository is the V2 monorepo: `apps/web` (the site) → `modules/*` (features) → `packages/*` (foundations), with content in `content/<locale>` and `content/data`. The direction is enforced by `tests/architecture-boundaries.test.mjs`.

- Before writing, moving or importing code: use the `v2-architecture` skill (where code goes, allowed imports, tools).
- To find a file and what depends on it, ask the map first: `node scripts/audit/where.mjs <file>` (`project-map` skill).
- Structural changes go through the tools (`npm run new-module`, `node scripts/v2/mv.mjs`, `npm run port-branch`), then `npm run map`.
- Full picture: `docs/v2/ARCHITECTURE.md`; decisions: `docs/v2/adr/`.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Content governance

@docs/content-guidelines.md

Any work that creates or edits site content (blog posts, learn lessons, reference entries, quizzes, exercises, projects) must follow that framework — run the page-existence test (section 7) before creating a new page, and prefer merge/update over a new URL when in doubt.

# SEO technical policy

@docs/seo-technical-policy.md

Mechanical, enforced rules (title/description length, no duplicate H1, internal links must resolve, no orphaned blog posts, reference `related[]` must resolve, summary lessons sort last, etc.) — every rule maps to a permanent check in `run-ci.cmd`. Run `run-ci.cmd` (or the individual `npm run check:*` scripts) before considering any content change done.

# Factual data governance (read on demand, not auto-loaded)

Working on `content/data/academic-universities/`, `content/data/academic-study-plans/`, `modules/academic/src/pipeline/` (the extraction pipeline), or `/jobs` content? Read `docs/factual-data-governance.md` first — it's deliberately *not* imported here like the two files above, since its provenance/source-hierarchy/versioning rules only apply to factual/extracted data, not editorial lessons or blog posts.

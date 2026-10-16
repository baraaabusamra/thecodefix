# The Code Fix V1 — Initial Repository Inventory

**Inspection branch:** `docs/v2-repository-audit`  
**Status:** Initial inventory based on repository tree snapshot and direct reads of selected configuration and architecture files. A fresh automated census and complete file-by-file review remain outstanding.

## 1. Runtime and project identity

| Item | Observed value | Evidence |
|---|---|---|
| Package | `thecodefix`, private application | `package.json` |
| Web framework | Next.js 16.2.11 | `package.json` |
| UI runtime | React 19.2.4 | `package.json` |
| Language/tooling | TypeScript 5; ESLint 9 | `package.json` |
| Runtime pin | Node.js 24 | `.nvmrc` |
| Content formats | MDX, JSON | `package.json`, `src/content/` inventory |
| Database layer | Drizzle ORM; Neon serverless driver | `package.json` |
| Auth | NextAuth v5 beta and Drizzle adapter dependencies | `package.json`; runtime wiring requires further tracing |
| CI entry point | `npm run ci` | `package.json`, `.github/workflows/ci.yml` |

## 2. Main script families

- Development/build: `dev`, `build`, `start`, `lint`, `typecheck`.
- Test and integrity: `test`, `check:all`, link/frontmatter/summary/H1/reference/quiz/roadmap/academic/orphan-blog checks.
- Database and migrations: Drizzle generation/migration commands, migration verification/locking, DB verification.
- SEO: title audit and index-notification script.
- Content utilities: lesson-date generation.
- Special runtime proof: `verify:python-sandbox`, documented as requiring a real browser and internet access, and intentionally excluded from regular CI.

Full script behavior must be mapped by the quality/CI Skill; names alone are not proof of coverage.

## 3. Existing instruction and governance files

- `AGENTS.md` imports `docs/content-guidelines.md` and `docs/seo-technical-policy.md`.
- `CLAUDE.md` imports `AGENTS.md`.
- `.claude/commands/` has six commands in the previously inspected tree: `arch-review.md`, `branding.md`, `create-new-track.md`, `fill-content-gaps.md`, `schema-design.md`, and `tradeoffs.md`.
- `rules/` contains a large set of Cursor rule files in the previous tree snapshot.
- This audit adds specialist Skills under `.claude/skills/`; they are instructions for an agent and are not themselves proof that the mapping tasks have been executed.

## 4. Content and application surfaces identified

- Lesson content: `src/content/tracks/` (MDX) and per-track metadata such as `_meta.json`.
- Blog: `src/content/blog/` (MDX).
- Reference material: `src/content/reference/` (JSON).
- Main application routes include learning, blog, reference, admin SEO, and additional product areas described in `docs/site-architecture.md`.
- Core inspected helpers include `src/lib/content.ts`, `src/lib/blog.ts`, and `src/lib/seo.ts`.
- Persistence/schema entry point inspected: `src/db/schema.ts`.

The route and content list above is an orientation, not an exhaustive route registry.

## 5. Counts and drift warning

A previously retrieved recursive repository-tree snapshot reported approximately 2,456 blobs, 214 directories, 1,233 lesson MDX files, 103 blog MDX files, 35 reference JSON files, 47 `.test.mjs` files, 6 Claude commands, 257 files under `rules/`, and no `SKILL.md` files in that snapshot.

However, `docs/site-architecture.md` includes an earlier dated snapshot (2026-09-05) reporting 1,164 lessons, 90 blog posts, 51 tracks, and 2,641 sitemap URLs. These counts were taken at different times and possibly by different counting methods. They must not be treated as directly comparable until a deterministic census and sitemap count are regenerated at one commit.

## 6. Known unknowns

- Full route/API/server-action registry and route-to-module call graph.
- Current complete counts regenerated at the exact inspected commit.
- Actual runtime wiring for all declared dependencies.
- Every DB table's callers and every write path.
- Complete command/rule overlap analysis.
- Check-to-test traceability and actual test execution results.
- External integrations and provider data lineage, excluding secret values.

## 7. Next action

Run `v1-inventory-mapper` in the repository's agent environment to regenerate counts at HEAD, then run the specialist Skills in the order defined by `docs/repository-audit/README.md`. Reconcile this document whenever new evidence contradicts the snapshot.

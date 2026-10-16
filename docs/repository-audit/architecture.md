# The Code Fix V1 — Architecture Audit

**Status:** Initial static review; not a complete line-by-line audit  
**Branch:** docs/v2-repository-audit  
**Execution status:** No local build, test suite, or content checks were run during this review.

## 1. High-level architecture

    Content Sources
    ├── File-backed lessons: src/content/tracks/<track>/*.mdx
    ├── Track metadata: src/content/tracks/<track>/_meta.json
    ├── Blog posts: src/content/blog/*.mdx
    ├── Reference content: src/content/reference/*.json
    └── Database-managed content
              │
              ▼
    Parsing and domain helpers
    ├── src/lib/content.ts — merges file and published DB content
    ├── src/lib/blog.ts — reads blog MDX and calculates related-post candidates
    └── src/lib/seo.ts — builds base, track, and lesson keyword lists
              │
              ▼
    Next.js routes and rendering
    ├── src/app/learn/...
    ├── src/app/blog/...
    ├── src/app/reference/...
    └── src/app/admin/seo/...
              │
              ▼
    Validation
    ├── tests/**/*.test.mjs
    ├── scripts/*.mjs
    ├── scripts/run-tests.mjs
    ├── scripts/run-checks.mjs
    └── .github/workflows/ci.yml

This is a high-level model based on inspected files, not a complete dependency graph of every route and module.

## 2. Key verified observations

- src/lib/content.ts reads lesson files using gray-matter and merges them with published database records. File-backed slugs take precedence when the same slug exists in both sources.
- src/lib/blog.ts reads blog MDX files and calculates related posts using shared normalized keywords and title tokens; recency is a tie-breaker.
- src/lib/seo.ts creates templated keyword clusters for tracks and lessons. These are generated phrases, not measured search-volume or ranking data.
- src/app/admin/seo/page.tsx and actions.ts provide a database-backed keyword tracker with manually entered positions. The page describes Search Console API integration as future work.
- scripts/run-checks.mjs defines blocking integrity checks and a separate informational check for exact keyword collisions in reference sections.
- scripts/run-tests.mjs discovers tests/**/*.test.mjs files and requires Node.js 24 or newer for the test runner.
- .github/workflows/ci.yml runs typecheck, lint, tests, content/integrity checks, and a production build on pushes to and pull requests targeting main.
- docs/site-architecture.md already documents the site's broad routes and SEO structure. Reconcile it with new audit evidence rather than duplicating it.

## 3. Repository inventory snapshot

The recursive Git tree previously retrieved for this audit reported approximately:

- 2,456 file blobs
- 214 directories
- 1,233 lesson MDX files under src/content/tracks/
- 103 blog MDX files under src/content/blog/
- 35 JSON files under src/content/reference/
- 47 test files matching .test.mjs
- 6 existing commands under .claude/commands/
- 257 Cursor rule files under rules/
- 0 files named SKILL.md in that tree snapshot

Counts are a tree snapshot, not proof that each file's contents were read. Counts can change as the repository changes.

## 4. CI interpretation

The package script npm run ci sequences typecheck, lint, tests, check:all, and build. GitHub Actions has recent successful CI runs in the history inspected during this audit. This does not establish that the current checkout has been tested locally during this audit; no local execution was performed.

## 5. Open mapping work

- Trace every relevant route to its data readers and renderers.
- Map DB schema tables to the content/admin flows that use them.
- Map each check script to covered file types, exit behavior, and corresponding tests.
- Trace the full CI path, including migration integrity and checks not included in check:all.
- Inspect all current Claude commands and Cursor rules for overlap before creating new Skills.
- Identify actual import/reference edges and produce a machine-generated dependency graph.

## 6. Acceptance criteria for completing this audit

- Every relevant module has an owner/purpose and known inputs/outputs.
- Every proposed reused module is supported by a file reference and a validation status.
- Unknown or unverified behavior is explicitly marked, not inferred.
- No production source files are changed by the audit-only phase.

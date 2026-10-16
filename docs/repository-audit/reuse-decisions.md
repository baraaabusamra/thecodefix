# The Code Fix V2 — V1 Reuse Decisions

**Status:** Provisional decisions from the initial static review  
**Rule:** Preserve working V1 behavior. Extend existing capabilities before adding parallel implementations. Final decisions require tests and broader dependency tracing.

## Keep and build on

| Existing component | Evidence | Decision |
|---|---|---|
| docs/content-guidelines.md | Defines content governance, page-existence tests, accuracy, duplication, Arabic editorial quality, and learning-graph principles | Keep as editorial policy baseline; automate only repeatable rules |
| docs/seo-technical-policy.md | Documents concrete technical SEO rules and associated check commands | Keep; audit every stated rule against current implementation |
| scripts/run-checks.mjs | Centralizes blocking and informational checks | Keep as the single integrity-check entry point |
| scripts/run-tests.mjs and tests/ | Existing test runner and suite | Keep; add regression tests for new audit engines |
| .github/workflows/ci.yml and npm run ci | Existing typecheck, lint, test, integrity-check, and build pipeline | Keep; add V2 checks after they are deterministic and stable |
| src/lib/content.ts | Existing file/database content merge logic | Reuse as a source adapter where appropriate; avoid changing public content behavior for the audit system |
| src/lib/blog.ts | Existing blog parsing and related-post heuristic | Reuse parsing knowledge; do not treat current ranking as a complete semantic graph |
| src/lib/seo.ts | Existing templated keyword helpers | Keep for metadata generation; separate generated phrases from measured keyword research |
| src/app/admin/seo/ | Existing protected keyword tracking interface and server actions | Evaluate as the natural place to extend reporting |
| docs/site-architecture.md | Existing route/content/SEO architecture document | Update or cross-link after evidence collection; avoid a competing architecture overview |

## Extend after coverage analysis

| Area | Current limitation observed | Proposed extension |
|---|---|---|
| Keyword overlap | Exact duplicate keywords within each reference JSON section | Add cross-content candidate detection across lessons, blog, and reference pages; distinguish heuristics from measured search data |
| Related content | Blog related-post selection uses keyword/title-token overlap | Add explicit content relationships and graph diagnostics; retain existing behavior until replacement is proven |
| SEO reporting | Positions are manually entered in the admin tracker | Add a provider adapter for Search Console after access and data contracts are decided |
| Content checks | Strong collection of specific structural checks | Add machine-readable findings, stable IDs, paths, severity, and test coverage |
| Accuracy review | Editorial policy requires technical verification | Build claim/evidence tracking with source dates and human-review states |

## Build new, only after the audit confirms the gap

1. Content Registry: stable ID, source path, content type, hash, audit status, and links.
2. Unified Finding Schema: findings with evidence, confidence, source, and remediation suggestions.
3. Similarity Candidate Engine: exact, near-duplicate, and semantic candidate generation with human review.
4. Content Graph Audit: orphan detection, unresolved edges, prerequisites, parent/child topics, and learning-path gaps.
5. Audit Orchestrator: schedules applicable checks and re-runs impacted checks after content changes.
6. Audit UI extensions: add views to the existing admin area after data contracts and access control are reviewed.

## Do not do yet

- Do not replace the content loader or current SEO helpers wholesale.
- Do not generate or edit large batches of lessons.
- Do not make semantic-similarity scores automatic merge decisions.
- Do not invent search volume, ranking, impressions, or click metrics when no data source supplied them.
- Do not create a new database schema until the existing schema and migration conventions are mapped.
- Do not add a new graph/database dependency before a small proof of concept establishes the need.

## Required evidence before decisions become final

- Call sites and imports for the proposed module.
- Existing tests and test gaps.
- Runtime/configuration requirements.
- CI behavior and failure mode.
- Migration/backward-compatibility impact, if any.
- A small test fixture showing the proposed behavior.

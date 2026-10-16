# Existing Check Pipeline — Coverage Map

**Status:** Partial static mapping. Individual scripts/tests still need full review.

## Pipeline contract

The package scripts define:

- npm run ci: typecheck → lint → tests → check:all → production build.
- npm test: invokes scripts/run-tests.mjs.
- npm run check:all: invokes scripts/run-checks.mjs.
- .github/workflows/ci.yml: runs the same major validation stages on pushes and pull requests to main.
- .nvmrc: pins Node 24. scripts/run-tests.mjs exits early below Node 24.

The normal CI workflow does not run verify:python-sandbox because it requires a real browser and internet access. A structural guard is included in the regular test suite.

## Checks explicitly listed by scripts/run-checks.mjs

| Script | Blocking in check:all? | Primary apparent purpose |
|---|---:|---|
| check:links | Yes | Internal/content links |
| check:summary-order | Yes | Lesson summary ordering |
| check:frontmatter | Yes | Lesson metadata and duplicate ordering |
| check:blog-ref | Yes | Blog/reference metadata consistency |
| check:redundant-h1 | Yes | Duplicate/redundant H1 guard |
| check:ref-related | Yes | Related-reference integrity |
| check:quizzes | Yes | Quiz integrity |
| check:quiz-bank | Yes | Quiz-bank integrity |
| check:roadmaps | Yes | Roadmap integrity |
| check:academic | Yes | Academic content integrity |
| check:academic-courses | Yes | Academic course integrity |
| check:orphan-blog | Yes | Blog reachability |
| check:migrations | Yes | Migration integrity |
| check:ref-keywords | No; informational | Exact keyword collisions inside each reference section |

This table records the script names and apparent intent from package.json, scripts/run-checks.mjs, and selected script source. It does not claim every rule in every script has been fully audited.

## Current limitations to investigate

- The runner separates blocking checks from informational checks. V2 findings should preserve that distinction and report why a check is non-blocking.
- Most reviewed scripts print human-readable console output. Confirm whether any already emit JSON or stable finding identifiers before creating a new reporting layer.
- check:ref-keywords checks normalized exact keyword equality inside each individual JSON section. It is not a semantic similarity detector and does not compare every lesson against every blog post.
- The orphan-blog check has a potential drift risk: its local reproduction of related-post ranking must remain identical to the production helper, including tie-breakers. See findings.md.
- The full mapping from each check to test coverage has not yet been completed.

## Next verification tasks

1. Read each check script end-to-end and record all rules and exit codes.
2. Find its tests, fixtures, and boundary cases.
3. Confirm the CI run corresponds to the current branch head before accepting a passing status.
4. Design a common finding contract only after the existing output formats are known.

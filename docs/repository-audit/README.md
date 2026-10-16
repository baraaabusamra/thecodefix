# The Code Fix V1 — Full Mapping Program

## Mission

Understand the existing V1 before designing V2. This phase is discovery and documentation only. Do not change production behavior, refactor modules, migrate data, or bulk-edit content.

## How to run the Skills

Use the Skills in `.claude/skills/` in this order. Each Skill must inspect the actual repository, cite paths and relevant symbols, distinguish facts from hypotheses, and save its report under `docs/repository-audit/`.

1. **v1-inventory-mapper** — establish the repository census and source-of-truth list.
2. **v1-architecture-mapper** — trace routes, components, libraries, APIs, actions, auth, and runtime flows.
3. **v1-content-pipeline-mapper** — trace lesson/blog/reference content from source to rendering and validation.
4. **v1-seo-mapper** — trace metadata, indexability, internal links, sitemap, robots, structured data, keyword tracking, and SEO checks.
5. **v1-data-security-mapper** — trace DB schema, migrations, authentication, authorization, and sensitive data boundaries.
6. **v1-quality-ci-mapper** — map scripts, tests, fixtures, CI jobs, quality gates, and coverage gaps.
7. **v1-dependency-synthesizer** — reconcile the specialist reports into one cross-linked system map, unresolved questions, and a V1 reuse decision register.

Run one Skill at a time initially. Review its evidence and outputs before proceeding, so later Skills can correct or build on earlier discoveries.

## Required report contract

Every report must include:

- Scope, branch/commit inspected, and timestamp if available.
- Executive summary in plain language.
- Evidence table: claim, file path, symbol/line range when available, and confidence.
- Flow diagrams using Mermaid or plain text.
- Inputs, outputs, side effects, dependencies, and callers for each major subsystem.
- Confirmed findings vs hypotheses vs unknowns.
- Tests/checks that validate the subsystem and any gaps.
- Questions that require runtime verification.
- No secrets, credentials, tokens, private user data, or copied environment values.

## Evidence and confidence rules

- Do not say “the whole repository was read” unless every relevant file was actually inspected.
- Repository counts are snapshots and must record the commit/tree they came from.
- A missing search result is not proof of absence.
- Distinguish static analysis from executed tests and observed runtime behavior.
- Never invent metrics from Google, analytics, or search providers.
- For large content collections, use deterministic scripts and sampled/manual validation rather than pasting thousands of files into context.
- Findings should include reproduction steps or a test proposal when feasible.

## Completion gate

V1 mapping is ready for V2 planning only when:
- All seven specialist reports exist or explicitly explain why a scope is unavailable.
- Route/data/content/SEO/security/CI flows cross-reference each other.
- Major data stores and write paths are mapped.
- Each check script is mapped to the behavior it checks and tests that exercise it.
- Risks and unresolved questions are ranked.
- Reuse decisions are supported by evidence.
- A human review approves the map before source code changes begin.

## Current baseline documents

- `architecture.md`
- `reuse-decisions.md`
- `gaps.md`
- `check-coverage.md`
- `findings.md`

These are initial snapshots, not the final map. Reconcile and correct them as stronger evidence is collected.

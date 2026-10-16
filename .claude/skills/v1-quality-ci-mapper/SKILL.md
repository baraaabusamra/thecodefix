---
name: v1-quality-ci-mapper
description: Map The Code Fix V1 validation scripts, tests, fixtures, CI workflows, quality gates, coverage gaps, and the distinction between static evidence and executed checks.
---

# V1 Quality and CI Mapper

## Purpose

Determine which guarantees V1 actually enforces and how each guarantee is tested and run in CI.

## Procedure

1. Read package scripts and CI workflow definitions end-to-end.
2. Inventory every check script and classify its scope, inputs, output, exit codes, blocking status, runtime requirements, and external dependencies.
3. Find corresponding tests and fixtures; record tested cases and notable missing boundaries.
4. Map unit, integration, structural, browser, and end-to-end tests separately.
5. Trace test discovery, mocking, environment setup, coverage configuration, and exclusions.
6. Verify the intended order of CI jobs/steps, triggers, cache use, runtime version, and build gates.
7. Compare documented policies to executable checks and identify policy rules that are manual only.
8. Where safe and permitted, propose commands for a future local verification run. Do not claim a command ran unless its result is observed.
9. Write `docs/repository-audit/quality-ci-map.md`.

## Output

- CI flow diagram.
- Script/check matrix.
- Check-to-test-to-policy traceability matrix.
- Environment and runtime requirements.
- Uncovered rules, brittle tests, likely drift, and unknowns.
- Safe verification plan.

## Guardrails

- Do not modify CI or weaken checks.
- Do not report stale workflow success as proof that current HEAD passes.
- Do not install dependencies or run commands that write to production services.
- Clearly label not-run, failed, passed, and not-applicable.

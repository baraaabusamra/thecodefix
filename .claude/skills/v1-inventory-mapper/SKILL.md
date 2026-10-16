---
name: v1-inventory-mapper
description: Build a verifiable census of The Code Fix V1 repository, entry points, configuration, content collections, automation, and existing agent instructions before architecture or V2 planning.
---

# V1 Inventory Mapper

## Purpose

Create the evidence-backed inventory for understanding The Code Fix V1. This is a read-only discovery task except for writing its report under `docs/repository-audit/`.

## Procedure

1. Record the current branch, HEAD commit, repository root, package manager, runtime constraints, and available scripts.
2. Generate a deterministic file census grouped by directory and extension. Exclude generated output, dependencies, caches, and vendored files; document exclusion rules.
3. Inventory application entry points, route groups, API routes, server actions, shared components, libraries, DB/schema/migrations, content sources, public assets, scripts, tests, CI, deployment config, docs, and agent instruction files.
4. Inventory `AGENTS.md`, `CLAUDE.md`, `.claude/commands/`, `.claude/skills/`, `rules/`, Cursor rules, and other AI instructions. Identify overlapping responsibilities without assuming they are redundant.
5. Record configuration file names and what they control. Never reveal secret values from `.env*`, CI settings, or deployment config.
6. Identify generated files and sources of truth. Where uncertain, record a question rather than guessing.
7. Search for existing dependency/report-generation tooling before proposing new tooling.
8. Write `docs/repository-audit/inventory.md` and update the audit README with the inspected commit.

## Output format

- Snapshot metadata and counting method.
- Top-level directory map.
- File counts by type and major subtree.
- Entry-point and configuration registry.
- Existing documentation and agent-tool inventory.
- Source-of-truth table.
- Unknowns and next inspection targets.

## Guardrails

- Do not install packages or modify app code.
- Do not print secrets or personal data.
- Counts are not code understanding; state what was and was not opened.
- A file not found in one search is not proof that it does not exist.

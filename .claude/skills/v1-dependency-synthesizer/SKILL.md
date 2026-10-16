---
name: v1-dependency-synthesizer
description: Reconcile specialist V1 audit reports into a cross-linked dependency map, evidence ledger, unknowns list, and justified V2 reuse/build decisions.
---

# V1 Dependency Synthesizer

## Purpose

Turn specialist reports into one coherent system model without hiding conflicts or treating guesses as facts.

## Inputs

Read all available reports under `docs/repository-audit/`, existing `docs/site-architecture.md`, repository inventory, package scripts, and relevant source files for disputed claims.

## Procedure

1. Check each specialist report for scope, inspected commit, evidence paths, and confidence.
2. Resolve contradictions by inspecting source files. If unresolved, preserve the conflict as an open question.
3. Build a cross-domain dependency map connecting routes → modules → content/data → SEO behavior → checks/tests → CI.
4. Mark critical paths, single sources of truth, duplicated logic, and likely change-impact zones.
5. Create a traceability matrix from user-visible features to code, data, security, validation, and tests.
6. Consolidate findings into confirmed, suspected, and unknown categories.
7. Update `reuse-decisions.md` only when evidence supports the decision; explain why each proposed new engine cannot be satisfied by an existing component.
8. Produce `docs/repository-audit/system-map.md`, `evidence-ledger.md`, and a ranked V2 planning backlog.
9. Do not authorize implementation simply because a report is complete; state what needs human review.

## Completion criteria

- Every major flow links to actual files and symbols.
- Each high-priority finding has evidence, confidence, impact, and verification path.
- Existing implementations and policies are compared, not assessed in isolation.
- The map distinguishes runtime edges from conceptual relationships.
- Remaining unknowns have concrete next actions.
- No production source code has been changed by the mapping work.

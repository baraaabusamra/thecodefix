---
name: v1-content-pipeline-mapper
description: Map all The Code Fix V1 content sources, schemas, parsing, validation, rendering, related content, internal references, and publishing workflows.
---

# V1 Content Pipeline Mapper

## Purpose

Determine how educational lessons, blog posts, reference entries, quizzes, roadmaps, and database-managed content are authored, validated, loaded, and rendered.

## Procedure

1. Identify every content source format and its canonical location, metadata/frontmatter schema, slug rules, and ownership.
2. Trace each source through parsers/loaders/domain helpers to the route or UI that renders it.
3. Inspect precedence and merge behavior when file-backed content and database content overlap.
4. Map content relationships: track/lesson hierarchy, prerequisites, related posts/references, quizzes, roadmaps, navigation, and internal links.
5. Inventory validation scripts and schemas; record exactly what each validates, what it skips, and whether failure blocks CI.
6. Review representative content samples across different tracks and content types. Use deterministic metadata extraction for large collections.
7. Identify missing metadata, malformed relationships, orphaned content, duplicate slugs, stale references, and any editorial rules without automated enforcement.
8. Distinguish technical correctness review from structural checks and AI-generated quality judgments.
9. Write `docs/repository-audit/content-pipeline-map.md`.

## Output format

- Source-to-render flow diagram.
- Content type/schema/source-of-truth table.
- Loader and precedence rules.
- Relationship graph model.
- Validation matrix with script, rule, scope, exit behavior, and test.
- Known failure modes, sampled evidence, and unresolved questions.

## Guardrails

- Do not rewrite, generate, or bulk-normalize content.
- Do not assume a page is duplicate solely because it shares a topic.
- Do not claim content accuracy from frontmatter or lint success.
- Preserve exact file paths and cite examples.

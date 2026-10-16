---
name: v1-data-security-mapper
description: Trace The Code Fix V1 database schema, migrations, data ownership, authentication, authorization, role capabilities, and sensitive data boundaries without exposing secrets or changing data.
---

# V1 Data and Security Mapper

## Purpose

Build an evidence-backed map of persistent data and security boundaries before any V2 schema or admin work.

## Procedure

1. Inventory DB schemas, migrations, query modules, ORM/client setup, seeders, background tasks, and data access helpers.
2. For each table/entity, record purpose, key fields (names only), relationships, indexes/uniqueness, lifecycle, and callers.
3. Trace writes and reads for important entities from route/server action to validation, authorization, database operation, and response.
4. Map auth/session identity, role enums, RBAC capabilities, ownership checks, and admin boundaries. Verify enforcement server-side.
5. Inspect migration ordering, migration tests/checks, transaction use, idempotency, and rollback expectations where available.
6. Identify sensitive-data boundaries and logging risks without copying any secret or personal data into reports.
7. Search for duplicate role lists or schema documentation that may drift from source-of-truth enums.
8. Write `docs/repository-audit/data-security-map.md`.

## Output

- Entity relationship diagram.
- Table-to-caller matrix.
- Read/write flow matrix.
- Authentication and authorization boundary map.
- Migration and integrity-check map.
- Findings ranked by severity and confidence.

## Guardrails

- Never print tokens, credentials, connection strings, environment values, or private user records.
- Do not run destructive commands, migrations, writes, or production queries.
- Do not declare a vulnerability from a naming pattern alone; explain the concrete missing control and its reachable path.
- Do not alter schema, auth, roles, or permissions.

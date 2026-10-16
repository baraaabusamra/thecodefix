---
name: v1-architecture-mapper
description: Trace The Code Fix V1 runtime architecture from routes and entry points through components, libraries, APIs, server actions, authentication, and external services, with evidence-backed diagrams.
---

# V1 Architecture Mapper

## Purpose

Explain how the application works end-to-end. Read-only except for a report under `docs/repository-audit/`.

## Procedure

1. Start with package scripts, framework configuration, middleware/proxy, root layouts, route trees, and documented architecture.
2. Inventory routes by user journey and route type: public pages, learning pages, blog/reference, admin, API, auth callbacks, and server actions.
3. For each route family, trace imports and calls into components, domain libraries, DB access, external providers, and shared helpers.
4. Identify request/render boundaries: server component, client component, server action, API handler, background job, build-time generation, or static asset.
5. Map authentication and authorization checks at every protected read/write boundary. Record where enforcement occurs, not only where UI is hidden.
6. Trace at least one representative end-to-end flow per major feature, including error/loading/not-found paths when present.
7. Identify cycles, duplicated logic, overly broad modules, dynamic imports, and implicit coupling. Treat these as candidates until impact is evidenced.
8. Produce Mermaid diagrams plus a route-to-module table in `docs/repository-audit/architecture-map.md`.

## Required flow fields

For each flow record: trigger, route/entry point, inputs, validation, core functions, data sources, side effects, response/rendered output, auth boundary, failure behavior, and tests.

## Guardrails

- Do not infer runtime behavior solely from filenames.
- Follow actual imports and call sites.
- Do not claim an API is reachable or secure without checking its route and guard.
- Do not modify runtime code or public behavior.
- Mark unresolved paths as unknown and provide a concrete verification task.

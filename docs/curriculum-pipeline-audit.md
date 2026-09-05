# Curriculum Pipeline — Current Architecture and Operating State

**Last verified:** 2026-09-04
**Operational state:** collection tools available to authorized admins;
paid AI extraction **disabled by default**; extracted data has no review or
public-publish UI.

See [`factual-data-governance.md`](factual-data-governance.md) for provenance,
source hierarchy, no-fabrication, conflict-resolution, and versioning rules.

## 1. Safety decision

The former `/admin/pipeline/review` workflow was intentionally removed. The
pipeline database schema and historical queue data remain intact, but there is
currently no supported human review or public publishing path for new AI
extractions.

Therefore:

- Provider credentials alone must never start extraction.
- `CURRICULUM_EXTRACTION_ENABLED=true` is required server-side before any
  extraction database access or AI-provider call.
- The default, missing, empty, `false`, `1`, or any other value keeps the stage
  disabled. Only a trimmed, case-insensitive `true` enables it.
- Keep the flag `false` in production while no review/publish path exists.
- Do not delete the review queue or historical pipeline data as part of this
  operational pause.

The flag is intentionally **not** prefixed with `NEXT_PUBLIC_`; it stays on the
server and is passed to the authorized admin UI only as a boolean display state.

## 2. Current implemented architecture

The pipeline is no longer a proposal. The repository currently contains:

- Relational PostgreSQL/Drizzle tables for universities, programs, sources,
  documents, collection jobs, extraction runs/evidence, curriculum versions,
  courses/prerequisites, and the review queue.
- Source discovery and ranking with an optional Tavily provider.
- Controlled collection jobs with global and targeted claim paths.
- HTML and PDF collection/parsing with SSRF and deduplication protections.
- Gemini-backed structured curriculum extraction.
- Extraction-run claims preventing duplicate concurrent paid AI calls.
- Evidence, confidence, curriculum and course persistence.
- A quarantine write to `pipelineReviewQueue` after persistence succeeds.
- No active reader/reviewer/publisher for new review-queue rows.

Public academic pages continue to read approved static/legacy data. New AI
extractions cannot reach those pages through this pipeline.

## 3. Entry points and defense in depth

The authorized manual UI is `/admin/pipeline/test`.

The paid stage is guarded in three layers:

1. **Server Action:** `runExtractionBatch()` re-authenticates the caller and
   requires `settings:manage`, then checks the feature flag.
2. **Batch helper:** `runExtractionForPendingDocuments()` checks the flag before
   `requireDb()` so disabled calls have no DB side effect.
3. **Provider pipeline:** `runExtractionPipeline()` checks the flag before DB
   claiming or construction/invocation of the Gemini extractor. Direct internal
   invocation cannot bypass the operational pause.

The UI receives the same server-computed boolean, disables the extraction
button, and explains that no AI provider call is made. The UI is not the
security boundary; the two lower server layers remain authoritative.

## 4. What remains active

Authorized admins can still inspect pipeline universities/programs and use the
separate discovery, enqueue, and collection controls. These do not invoke the
curriculum extraction provider. They may still use network/provider resources
such as Tavily, so they should be run deliberately rather than scheduled.

There is no cron or unattended scheduler for extraction in the current code.

## 5. Extraction data flow when explicitly enabled

```text
collected document
  → authorization + operational gate
  → completed-run idempotency check
  → concurrency-safe extraction claim
  → Gemini structured extraction
  → curriculum/course/evidence persistence
  → pending pipelineReviewQueue row
  → extraction run marked completed
  → STOP (no review/publish UI exists)
```

The queue insert remains last and the run is marked completed only after all
required persistence succeeds. Partial writes never become public content.

## 6. Re-enablement checklist

Do not set `CURRICULUM_EXTRACTION_ENABLED=true` until the owner explicitly
approves a destination for new results and all of the following are true:

- A supported reviewer workflow or an explicit non-public archival purpose is
  defined.
- The cost cap, batch size, provider/model, and operator are documented.
- Human review responsibilities follow `factual-data-governance.md`.
- Direct public writes remain impossible without a separate reviewed change.
- Regression tests, typecheck, lint, and the full CI/build pass.
- The flag is enabled first in a non-production environment for a single pilot.
- The flag can be switched off immediately without a deployment rollback.

## 7. Tests and invariants

The permanent extraction-gate test verifies:

- disabled-by-default behavior;
- explicit `true` enablement only;
- authorization occurs before feature-state disclosure;
- the action gate precedes the batch call;
- batch and direct pipeline gates precede DB/provider work;
- the Gemini smoke-test gate precedes provider construction;
- the admin UI uses the same server state.

Existing extraction tests explicitly enable the flag inside their isolated test
processes so they continue to exercise claims, failure safety, evidence linking,
and persistence behavior without weakening the production default.

## 8. Product decision still open

Two future paths are valid, but neither is authorized by this pause:

1. Keep extraction disabled and retain the tables as historical/quarantine
   infrastructure.
2. Design a new, separately approved review/publish workflow that respects the
   factual-data governance gates.

Until that decision is made, the correct production state is **disabled**.

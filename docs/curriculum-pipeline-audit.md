# Curriculum Pipeline Audit

> See [`factual-data-governance.md`](factual-data-governance.md) for the
> content-governance rules that apply to data flowing through this
> pipeline (source hierarchy, provenance, no-fabrication, conflict
> resolution, versioning) — this document covers the technical
> architecture, that one covers what's allowed to reach `pipelineReviewQueue`
> as a publishable fact.

## 1. Existing architecture
- Next.js 16 (App Router) used as a full-stack framework.
- Authentication handled by Auth.js (NextAuth) with a custom Drizzle adapter.
- RBAC is built into the `users` table via an enum (`userRole`).
- Server Actions and API routes are used for backend operations.
- UI components are organized under `src/components/`, with admin pages in `src/app/admin/`.

## 2. Existing database schema
- Uses PostgreSQL with Drizzle ORM (`src/db/schema.ts`).
- `academic_study_plan` table stores study plans in a loosely normalized format (categories and courses are stored as a JSON string).
- No tables exist for `sources`, `documents`, `extraction_runs`, `curriculum_versions`, `courses`, or `collection_jobs`.
- Study plans are queried from both static JSON files (`src/content/academic-study-plans/`) and the database (`academic_study_plan` table) and merged transparently.

## 3. Existing university/program relationships
- Universities and their specializations (programs) are defined statically in `src/content/academic-universities/*.json` (e.g., `egypt.json`).
- There is no normalized relational `universities` or `programs` table in the database. The `academic_study_plan` relies on text identifiers (`country`, `university`, `specialization`).
- Conflicts: The proposed pipeline needs relational consistency (e.g., University -> Program -> Curriculum Version), whereas the current system uses static JSON for universities and a JSON blob for the curriculum. We need to respect the static files as the source of truth for universities and map our relational pipeline tables (`sources`, `collection_jobs`, `curriculum_versions`) to the existing string identifiers (`country`, `university`, `specialization`).

## 4. Existing authentication/authorization
- `next-auth` is used.
- Role-based access control (RBAC) exists with roles like `admin`, `owner`, `student`, etc.
- Admin routes (`src/app/admin`) and server actions are protected by checking the user's role.

## 5. Existing admin functionality
- A custom admin dashboard exists at `/admin`.
- `StudyPlanEditor.tsx` and related pages (`/admin/academic`) handle manual creation and editing of study plans.

## 6. Existing dependencies that can be reused
- `zod` for validation.
- `drizzle-orm` for database queries.
- No existing HTML parsing (like `cheerio`), PDF parsing (like `pdf-parse`), or background job queue (like `bullmq` or `inngest`).

## 7. Missing functionality
- Database tables for the ingestion pipeline (`sources`, `documents`, `extraction_runs`, `review_queue`, etc.).
- Relational storage for granular courses, prerequisites, and canonical normalization.
- Source discovery (search API integration).
- Web document collection (crawler, rate-limiting, PDF extraction).
- AI curriculum extraction integration.
- Background job processing architecture.

## 8. Recommended integration strategy
- **Database:** Expand `schema.ts` with new pipeline tables. Use the existing composite keys (`country`, `university`, `specialization`) to link pipeline runs and sources to the static university definitions.
- **Job Processing:** Since no queue exists, and it's a serverless environment (Neon + Next.js), we can use PostgreSQL as a basic job queue (`collection_jobs` table) with an API route triggered by a cron job (e.g., Vercel Cron) or background workers processing the queue.
- **Extraction:** Use deterministic HTML/PDF parsing followed by structured output via AI (e.g., OpenAI API using `zod`).

## 9. Potential risks
- **Serverless Timeouts:** Heavy scraping and AI extraction might exceed serverless function execution limits. This mandates a granular, resumable job queue architecture.
- **Data Model Conflict:** Bridging the newly extracted relational data (`curriculum_versions`, `curriculum_courses`) with the legacy JSON structure (`academic_study_plan.categories`). When a review is approved, we must transform the relational data back into the expected JSON structure and insert/update `academic_study_plan`, maintaining backward compatibility.

## 10. Proposed implementation phases
1. **Schema Design:** Add pipeline tables without altering `academic_study_plan`.
2. **Job Architecture:** Implement a DB-backed job queue for background processing.
3. **Source Discovery & Collection:** Implement search and deterministic download capabilities.
4. **Parsing & AI Extraction:** Integrate document processing and LLM-based structured extraction.
5. **Validation quarantine:** Keep extracted curricula pending and unpublished; no admin review or publishing interface is exposed.
6. **Pilot Testing:** Run on a small set of predefined universities.

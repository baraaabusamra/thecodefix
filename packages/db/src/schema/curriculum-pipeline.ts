// Curriculum pipeline: the discovery -> collection -> extraction -> review
// machinery that produces academic curricula. Operational tables for an
// internal batch pipeline, not user-facing product data.
//
// Extracted from the single packages/db/src/schema.ts in Phase 2. That file is still
// the public entry point. No table, column, SQL type, default, index,
// constraint or enum value changed in the move.

import {
  pgTable,
  pgEnum,
  text,
  integer,
  numeric,
  timestamp,
  unique,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

// ── Curriculum Pipeline Enums ──────────────────────────────────────────
export const pipelineJobStatus = pgEnum("pipeline_job_status", [
  "pending",
  "searching",
  "source_found",
  "downloading",
  "parsing",
  "extracting",
  "validating",
  "completed",
  "needs_review",
  "failed",
  "cancelled"
]);

export const pipelineSourceType = pgEnum("pipeline_source_type", [
  "official_program_page",
  "official_curriculum_page",
  "official_pdf",
  "official_course_catalog",
  "official_department_page",
  "official_handbook",
  "official_document",
  "fallback_external"
]);

export const pipelineConfidenceLevel = pgEnum("pipeline_confidence_level", [
  "HIGH",
  "MEDIUM",
  "LOW"
]);

// Stable identifiers mapping
export const pipelineUniversities = pgTable("pipeline_university", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  countrySlug: text("countrySlug").notNull(),
  universitySlug: text("universitySlug").notNull(),
  officialDomain: text("officialDomain"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  unique("pipeline_university_slugs").on(t.countrySlug, t.universitySlug),
]);

export const pipelinePrograms = pgTable("pipeline_program", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  universityId: text("universityId").notNull().references(() => pipelineUniversities.id, { onDelete: "cascade" }),
  specializationSlug: text("specializationSlug").notNull(),
  canonicalName: text("canonicalName"), // Optional canonical english name
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  unique("pipeline_program_slugs").on(t.universityId, t.specializationSlug),
]);

export const pipelineSources = pgTable("pipeline_source", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  universityId: text("universityId").notNull().references(() => pipelineUniversities.id, { onDelete: "cascade" }),
  programId: text("programId").references(() => pipelinePrograms.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  // Phase 3.5B-6B-1: dedup identity only — see
  // modules/academic/src/pipeline/discovery/url-normalize.ts for the exact,
  // deliberately conservative normalization (lowercase scheme+host, drop
  // fragment/default port, collapse one trailing slash; query params and
  // www/http-https distinctions are preserved, never merged). `url` above
  // always keeps the original, unmodified string — normalizedUrl is never
  // used for the actual fetch or for SSRF validation, only for the
  // uniqueness index below. Left nullable rather than NOT NULL: every
  // current write site (jobs/process.ts) will always supply it once this
  // phase's code change ships, and the one-time backfill covers all
  // pre-existing rows, so NOT NULL would add no real protection — same
  // reasoning already applied to pipelineDocuments.contentHash in Phase
  // 3.5B-6B-2.
  normalizedUrl: text("normalizedUrl"),
  domain: text("domain"),
  sourceType: pipelineSourceType("sourceType").notNull(),
  title: text("title"),
  discoveredAt: timestamp("discoveredAt", { mode: "date" }).notNull().defaultNow(),
  lastCheckedAt: timestamp("lastCheckedAt", { mode: "date" }),
  contentHash: text("contentHash"),
  // Phase 3.5B-6B-1: 'active' | 'inactive'. Free text (matches the
  // pre-existing column's own convention, no enum), never read anywhere
  // before this phase (confirmed by full-repo grep) — repurposed here to
  // mark reconciled duplicate rows as historical/superseded WITHOUT ever
  // deleting them or reparenting their pipelineDocuments (see the Phase
  // 3.5B-6B-1 audit's provenance-cascade analysis for why deletion was
  // rejected: pipelineDocuments.sourceId is ON DELETE CASCADE, which
  // transitively cascades through extraction runs, evidence, and
  // review-queue rows). The uniqueness index below is scoped to
  // status='active' specifically so this flip is what makes a row stop
  // competing for the (universityId, programId, normalizedUrl) identity,
  // without touching anything else.
  status: text("status").notNull().default("active"),
  credibilityScore: integer("credibilityScore").notNull().default(0), // 0-100
}, (t) => [
  // Phase 3.5B-6B-1 (P1-BLOCKER duplicate source rows / duplicate discovery
  // + collection + AI cost): at most one ACTIVE source per logical
  // (universityId, programId, normalizedUrl) target. Applied ONLY after the
  // 59-row reconciliation (18 pre-existing duplicate groups, 77 rows,
  // marked non-canonical rows status='inactive') — a hard/global unique
  // index would have rejected that pre-existing data outright. Partial
  // (WHERE status='active'), not a plain unique constraint: an inactive
  // (reconciled/superseded) row must never block a future active row for
  // the same target, and this is also what makes the reconciliation itself
  // non-destructive (marking a row inactive, not deleting it, is what frees
  // up the identity slot). COALESCE(programId, '') closes the same
  // NULL-distinctness hole already handled identically in
  // pipeline_extraction_run_one_active_per_document (Phase 3.5B-4) —
  // programId is genuinely nullable (2 live rows) and NULLS NOT DISTINCT
  // is not usable here since it's unavailable on partial (WHERE-scoped)
  // indexes in this Drizzle version (confirmed in the Phase 3.5B-6A audit).
  uniqueIndex("pipeline_source_one_active_per_target")
    .on(t.universityId, sql`COALESCE(${t.programId}, '')`, t.normalizedUrl)
    .where(sql`${t.status} = 'active'`),
]);

export const pipelineDocuments = pgTable("pipeline_document", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sourceId: text("sourceId").notNull().references(() => pipelineSources.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  storagePath: text("storagePath"), // Vercel Blob path
  mimeType: text("mimeType"),
  fileSize: integer("fileSize"),
  contentHash: text("contentHash"),
  extractedText: text("extractedText"),
  pageCount: integer("pageCount"),
  parser: text("parser"), // e.g. "pdf2json", "cheerio"
  status: text("status").notNull().default("pending"),
  downloadedAt: timestamp("downloadedAt", { mode: "date" }),
  processedAt: timestamp("processedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  // Phase 3.5B-6B-2 (P1-BLOCKER duplicate document rows / duplicate paid
  // extraction): the same downloaded bytes for the same source must resolve
  // to exactly one pipelineDocuments row — collection previously always
  // inserted a new row even when an identical-hash document already existed
  // for that source, which meant retries and concurrent collection could
  // produce two documentIds for identical content, each independently
  // eligible for Phase 3.5B-4's per-documentId extraction claim (duplicate
  // paid Gemini calls). Deliberately NOT partial/WHERE-scoped (unlike the
  // two uniqueIndexes above) — every row, not just "active" ones, must obey
  // this. Deliberately NOT global-on-contentHash: identical bytes from two
  // DIFFERENT sources must remain separate rows to preserve per-source
  // provenance (confirmed live: 9 such cross-source groups already exist
  // and are legitimate, not duplicates). contentHash stays nullable — not
  // promoted to NOT NULL — because the single write site
  // (jobs/process.ts) always supplies it already (confirmed live: 0 of 51
  // existing rows have a NULL contentHash), so a NOT NULL constraint would
  // add no real protection, only risk. Ordinary (non-COALESCE) unique index
  // is correct here since there is no legitimate case needing multiple
  // NULL-contentHash rows for the same source to count as distinct.
  uniqueIndex("pipeline_document_source_content_hash_unique").on(
    t.sourceId,
    t.contentHash
  ),
]);

export const pipelineExtractionRuns = pgTable("pipeline_extraction_run", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  documentId: text("documentId").notNull().references(() => pipelineDocuments.id, { onDelete: "cascade" }),
  model: text("model"), // e.g. "claude-3-5-sonnet-20240620"
  promptVersion: text("promptVersion"),
  status: text("status").notNull().default("started"),
  startedAt: timestamp("startedAt", { mode: "date" }).notNull().defaultNow(),
  completedAt: timestamp("completedAt", { mode: "date" }),
  tokenUsage: integer("tokenUsage"),
  estimatedCost: text("estimatedCost"), // Using text to store decimals/small fractions
  error: text("error"),
  outputHash: text("outputHash"),
}, (t) => [
  // Phase 3.5B-4 (P1 duplicate-paid-extraction): at most one active
  // ("started") attempt per logical extraction key. promptVersion is
  // nullable in the column itself (unchanged — no NOT NULL added; current
  // production code always populates it, confirmed by a live preflight:
  // 0 existing rows have a NULL promptVersion), but Postgres treats every
  // NULL as distinct in an ordinary unique index, which would silently
  // permit two concurrent NULL-promptVersion 'started' rows for the same
  // document. COALESCE(promptVersion, '') closes that hole at the index
  // level without touching the column's contract — the least invasive of
  // the three options considered (raw index / COALESCE expression index /
  // NOT NULL column).
  uniqueIndex("pipeline_extraction_run_one_active_per_document")
    .on(t.documentId, sql`COALESCE(${t.promptVersion}, '')`)
    .where(sql`${t.status} = 'started'`),
]);

export const pipelineExtractionEvidence = pgTable("pipeline_extraction_evidence", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  documentId: text("documentId").notNull().references(() => pipelineDocuments.id, { onDelete: "cascade" }),
  extractionRunId: text("extractionRunId").notNull().references(() => pipelineExtractionRuns.id, { onDelete: "cascade" }),
  pageNumber: integer("pageNumber"),
  section: text("section"),
  text: text("text").notNull(),
  coordinates: text("coordinates"), // optional JSON of bounding box
  extractedField: text("extractedField"), // which field this evidence supports
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const pipelineCurriculumVersions = pgTable("pipeline_curriculum_version", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  programId: text("programId").notNull().references(() => pipelinePrograms.id, { onDelete: "cascade" }),
  academicYear: text("academicYear"),
  title: text("title"),
  version: text("version"),
  sourceId: text("sourceId").references(() => pipelineSources.id, { onDelete: "set null" }),
  status: text("status").notNull().default("draft"), // draft, approved, deprecated
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  // Historical integrity: at most one version may be "approved" per
  // program at a time. Keep the database constraint even though the former
  // admin review/publish interface has been retired, so existing data cannot
  // drift into an invalid state through maintenance scripts or direct writes.
  uniqueIndex("pipeline_curriculum_version_one_approved_per_program")
    .on(t.programId)
    .where(sql`${t.status} = 'approved'`),
]);

export const pipelineCourses = pgTable("pipeline_course", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  universityId: text("universityId").notNull().references(() => pipelineUniversities.id, { onDelete: "cascade" }),
  canonicalName: text("canonicalName"),
  normalizedName: text("normalizedName"),
  description: text("description"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const pipelineCurriculumCourses = pgTable("pipeline_curriculum_course", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  curriculumVersionId: text("curriculumVersionId").notNull().references(() => pipelineCurriculumVersions.id, { onDelete: "cascade" }),
  courseId: text("courseId").notNull().references(() => pipelineCourses.id, { onDelete: "cascade" }),
  officialCourseCode: text("officialCourseCode"),
  officialCourseName: text("officialCourseName"),
  // numeric, not integer: real credit hours are often fractional (e.g. a
  // 1.5-credit course with a separate lab component) — an AI extraction
  // returning 1.5 into an integer column fails the insert outright and
  // silently drops that curriculum before it ever reaches the review queue.
  credits: numeric("credits", { precision: 4, scale: 1, mode: "number" }),
  theoreticalCredits: numeric("theoreticalCredits", { precision: 4, scale: 1, mode: "number" }),
  practicalCredits: numeric("practicalCredits", { precision: 4, scale: 1, mode: "number" }),
  semester: integer("semester"),
  academicYear: integer("academicYear"), // e.g., Year 1, 2, 3
  courseType: text("courseType"), // e.g., Mandatory, Elective
  category: text("category"), // e.g., University Requirements, Faculty Requirements
  position: integer("position"), // order in the curriculum
  notes: text("notes"),
  confidence: pipelineConfidenceLevel("confidence"),
  evidenceId: text("evidenceId").references(() => pipelineExtractionEvidence.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const pipelineCoursePrerequisites = pgTable("pipeline_course_prerequisite", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  curriculumCourseId: text("curriculumCourseId").notNull().references(() => pipelineCurriculumCourses.id, { onDelete: "cascade" }),
  prerequisiteCourseId: text("prerequisiteCourseId").references(() => pipelineCourses.id, { onDelete: "set null" }),
  prerequisiteText: text("prerequisiteText").notNull(), // Exact text from source
  confidence: pipelineConfidenceLevel("confidence"),
  evidenceId: text("evidenceId").references(() => pipelineExtractionEvidence.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const pipelineCollectionJobs = pgTable("pipeline_collection_job", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  universityId: text("universityId").references(() => pipelineUniversities.id, { onDelete: "cascade" }),
  programId: text("programId").references(() => pipelinePrograms.id, { onDelete: "cascade" }),
  status: pipelineJobStatus("status").notNull().default("pending"),
  retryCount: integer("retryCount").notNull().default(0),
  maxRetries: integer("maxRetries").notNull().default(3),
  priority: integer("priority").notNull().default(0),
  scheduledAt: timestamp("scheduledAt", { mode: "date" }).notNull().defaultNow(),
  startedAt: timestamp("startedAt", { mode: "date" }),
  completedAt: timestamp("completedAt", { mode: "date" }),
  error: text("error"),
  metadata: text("metadata"), // JSON string
}, (t) => [
  // Phase 3.5B-7 (missing enqueue boundary found by Controlled Live Pilot
  // Stage 1): at most one ACTIVE collection job per logical
  // (universityId, COALESCE(programId, '')) target — same pattern/rationale
  // as pipeline_source_one_active_per_target. "Active" here means anything
  // claimNextJob() (jobs/claim.ts) could still select today: the five
  // in-flight statuses (regardless of staleness — a stale job is still this
  // target's job, due for automatic reclaim, not grounds for a second
  // competing job) OR 'failed' while retries remain. 'completed' and
  // 'cancelled' are excluded, and so are 'source_found' and 'needs_review'
  // — both defined in the pipeline_job_status enum but never produced by
  // process.ts and never matched by claimNextJob()'s own WHERE clause, so a
  // job stuck in either is exactly as unreachable to the processor as
  // 'completed' is. COALESCE(programId, '') closes the same NULL-distinctness
  // hole already handled identically for pipelineSources — programId is
  // genuinely nullable here too (university-level jobs).
  uniqueIndex("pipeline_collection_job_one_active_per_target")
    .on(t.universityId, sql`COALESCE(${t.programId}, '')`)
    .where(sql`
      ${t.status} IN ('pending','searching','downloading','parsing','extracting','validating')
      OR (${t.status} = 'failed' AND ${t.retryCount} < ${t.maxRetries})
    `),
]);

export const pipelineReviewQueue = pgTable("pipeline_review_queue", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  curriculumVersionId: text("curriculumVersionId").references(() => pipelineCurriculumVersions.id, { onDelete: "cascade" }),
  extractionRunId: text("extractionRunId").references(() => pipelineExtractionRuns.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(), // e.g. "no official source", "conflicting sources"
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reviewedBy: text("reviewedBy").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewedAt", { mode: "date" }),
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

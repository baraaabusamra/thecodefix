// Academic: real university curricula (courses, credit hours, prerequisites)
// backing the study-plan pages.
//
// Extracted from the single packages/db/src/schema.ts in Phase 2. That file is still
// the public entry point. No table, column, SQL type, default, index,
// constraint or enum value changed in the move.

import {
  pgTable,
  text,
  numeric,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { lessonStatus } from "./content";
import { pipelineCurriculumVersions } from "./curriculum-pipeline";

// ── Academic study plans (الجانب الأكاديمي) ───────────────────────────
// Real university curricula (course numbers, credit hours, prerequisites),
// keyed by the same (country, university, specialization) slugs used by the
// file-based catalog in content/data/academic-universities/*.json. Mirrors the
// content_track/content_lesson split: a curated study plan transcribed from an
// official document lives as a file (read-only, reviewed); one authored by an
// admin through the panel lives here and is editable in production. The
// nested category/course structure is stored as JSON text rather than
// normalized tables — it's always read/written whole (see StudyPlan in
// modules/academic/src/study-plans.ts), never queried by individual course row.
export const academicStudyPlans = pgTable(
  "academic_study_plan",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    country: text("country").notNull(),
    university: text("university").notNull(),
    specialization: text("specialization").notNull(),
    programNameEn: text("programNameEn").notNull().default(""),
    degree: text("degree").notNull().default("بكالوريوس"),
    // numeric, not integer: a program total can be fractional if any of its
    // courses are (e.g. a 1.5-credit course) — see the same reasoning on
    // pipelineCurriculumCourses.credits above.
    totalCreditHours: numeric("totalCreditHours", { precision: 5, scale: 1, mode: "number" }).notNull().default(0),
    source: text("source").notNull().default(""),
    sourceDate: text("sourceDate").notNull().default(""),
    generalNote: text("generalNote"),
    categories: text("categories").notNull().default("[]"), // JSON: StudyPlanCategory[]
    // Historical provenance of this row's CURRENT contents, not "this row
    // was ever touched by AI". The retired pipeline publisher populated the
    // exact pipelineCurriculumVersions.id; manual authoring clears it to NULL
    // in the same upsert that writes the content. Keep the nullable column so
    // existing published rows retain honest provenance without requiring a
    // destructive data migration.
    // ON DELETE SET NULL (not CASCADE/RESTRICT): this table is durable
    // public content and must survive deletion of pipeline-side history —
    // the same pattern already used for pipelineCurriculumVersions.sourceId,
    // pipelineCurriculumCourses.evidenceId, and
    // pipelineCoursePrerequisites.prerequisiteCourseId.
    pipelineCurriculumVersionId: text("pipelineCurriculumVersionId").references(
      () => pipelineCurriculumVersions.id,
      { onDelete: "set null" }
    ),
    // Editorial workflow (same states as CMS lessons). Only "published" rows
    // are public. Writers (content:edit) can only create/edit draft/review
    // rows; content:publish makes them public or takes them down. Existing
    // rows default to "published" so nothing already live disappears.
    status: lessonStatus("status").notNull().default("published"),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    unique("academic_study_plan_key").on(
      t.country,
      t.university,
      t.specialization
    ),
    // Supports "find the public plan a given version produced" /
    // "find all currently-pipeline-sourced plans" lookups. Not unique: no
    // proven 1:1 requirement between a version and a plan row.
    index("academic_study_plan_pipeline_curriculum_version_id_idx").on(
      t.pipelineCurriculumVersionId
    ),
  ]
);
export type AcademicStudyPlanRow = typeof academicStudyPlans.$inferSelect;
export type NewAcademicStudyPlanRow = typeof academicStudyPlans.$inferInsert;

// ── Curriculum Pipeline Tables (Phase 1) ─────────────────────────────

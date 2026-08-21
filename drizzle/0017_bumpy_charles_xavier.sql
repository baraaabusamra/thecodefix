CREATE TYPE "public"."pipeline_confidence_level" AS ENUM('HIGH', 'MEDIUM', 'LOW');--> statement-breakpoint
CREATE TYPE "public"."pipeline_job_status" AS ENUM('pending', 'searching', 'source_found', 'downloading', 'parsing', 'extracting', 'validating', 'completed', 'needs_review', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."pipeline_source_type" AS ENUM('official_program_page', 'official_curriculum_page', 'official_pdf', 'official_course_catalog', 'official_department_page', 'official_handbook', 'official_document', 'fallback_external');--> statement-breakpoint
CREATE TABLE "pipeline_collection_job" (
	"id" text PRIMARY KEY NOT NULL,
	"universityId" text,
	"programId" text,
	"status" "pipeline_job_status" DEFAULT 'pending' NOT NULL,
	"retryCount" integer DEFAULT 0 NOT NULL,
	"maxRetries" integer DEFAULT 3 NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"scheduledAt" timestamp DEFAULT now() NOT NULL,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"error" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "pipeline_course_prerequisite" (
	"id" text PRIMARY KEY NOT NULL,
	"curriculumCourseId" text NOT NULL,
	"prerequisiteCourseId" text,
	"prerequisiteText" text NOT NULL,
	"confidence" "pipeline_confidence_level",
	"evidenceId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_course" (
	"id" text PRIMARY KEY NOT NULL,
	"universityId" text NOT NULL,
	"canonicalName" text,
	"normalizedName" text,
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_curriculum_course" (
	"id" text PRIMARY KEY NOT NULL,
	"curriculumVersionId" text NOT NULL,
	"courseId" text NOT NULL,
	"officialCourseCode" text,
	"officialCourseName" text,
	"credits" integer,
	"theoreticalCredits" integer,
	"practicalCredits" integer,
	"semester" integer,
	"academicYear" integer,
	"courseType" text,
	"category" text,
	"position" integer,
	"notes" text,
	"confidence" "pipeline_confidence_level",
	"evidenceId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_curriculum_version" (
	"id" text PRIMARY KEY NOT NULL,
	"programId" text NOT NULL,
	"academicYear" text,
	"title" text,
	"version" text,
	"sourceId" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_document" (
	"id" text PRIMARY KEY NOT NULL,
	"sourceId" text NOT NULL,
	"url" text NOT NULL,
	"storagePath" text,
	"mimeType" text,
	"fileSize" integer,
	"contentHash" text,
	"extractedText" text,
	"pageCount" integer,
	"parser" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"downloadedAt" timestamp,
	"processedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_extraction_evidence" (
	"id" text PRIMARY KEY NOT NULL,
	"documentId" text NOT NULL,
	"extractionRunId" text NOT NULL,
	"pageNumber" integer,
	"section" text,
	"text" text NOT NULL,
	"coordinates" text,
	"extractedField" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_extraction_run" (
	"id" text PRIMARY KEY NOT NULL,
	"documentId" text NOT NULL,
	"model" text,
	"promptVersion" text,
	"status" text DEFAULT 'started' NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"tokenUsage" integer,
	"estimatedCost" text,
	"error" text,
	"outputHash" text
);
--> statement-breakpoint
CREATE TABLE "pipeline_program" (
	"id" text PRIMARY KEY NOT NULL,
	"universityId" text NOT NULL,
	"specializationSlug" text NOT NULL,
	"canonicalName" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pipeline_program_slugs" UNIQUE("universityId","specializationSlug")
);
--> statement-breakpoint
CREATE TABLE "pipeline_review_queue" (
	"id" text PRIMARY KEY NOT NULL,
	"curriculumVersionId" text,
	"extractionRunId" text,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewedBy" text,
	"reviewedAt" timestamp,
	"reviewNotes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_source" (
	"id" text PRIMARY KEY NOT NULL,
	"universityId" text NOT NULL,
	"programId" text,
	"url" text NOT NULL,
	"domain" text,
	"sourceType" "pipeline_source_type" NOT NULL,
	"title" text,
	"discoveredAt" timestamp DEFAULT now() NOT NULL,
	"lastCheckedAt" timestamp,
	"contentHash" text,
	"status" text DEFAULT 'active' NOT NULL,
	"credibilityScore" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_university" (
	"id" text PRIMARY KEY NOT NULL,
	"countrySlug" text NOT NULL,
	"universitySlug" text NOT NULL,
	"officialDomain" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pipeline_university_slugs" UNIQUE("countrySlug","universitySlug")
);
--> statement-breakpoint
ALTER TABLE "pipeline_collection_job" ADD CONSTRAINT "pipeline_collection_job_universityId_pipeline_university_id_fk" FOREIGN KEY ("universityId") REFERENCES "public"."pipeline_university"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_collection_job" ADD CONSTRAINT "pipeline_collection_job_programId_pipeline_program_id_fk" FOREIGN KEY ("programId") REFERENCES "public"."pipeline_program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_course_prerequisite" ADD CONSTRAINT "pipeline_course_prerequisite_curriculumCourseId_pipeline_curriculum_course_id_fk" FOREIGN KEY ("curriculumCourseId") REFERENCES "public"."pipeline_curriculum_course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_course_prerequisite" ADD CONSTRAINT "pipeline_course_prerequisite_prerequisiteCourseId_pipeline_course_id_fk" FOREIGN KEY ("prerequisiteCourseId") REFERENCES "public"."pipeline_course"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_course_prerequisite" ADD CONSTRAINT "pipeline_course_prerequisite_evidenceId_pipeline_extraction_evidence_id_fk" FOREIGN KEY ("evidenceId") REFERENCES "public"."pipeline_extraction_evidence"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_course" ADD CONSTRAINT "pipeline_course_universityId_pipeline_university_id_fk" FOREIGN KEY ("universityId") REFERENCES "public"."pipeline_university"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_curriculum_course" ADD CONSTRAINT "pipeline_curriculum_course_curriculumVersionId_pipeline_curriculum_version_id_fk" FOREIGN KEY ("curriculumVersionId") REFERENCES "public"."pipeline_curriculum_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_curriculum_course" ADD CONSTRAINT "pipeline_curriculum_course_courseId_pipeline_course_id_fk" FOREIGN KEY ("courseId") REFERENCES "public"."pipeline_course"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_curriculum_course" ADD CONSTRAINT "pipeline_curriculum_course_evidenceId_pipeline_extraction_evidence_id_fk" FOREIGN KEY ("evidenceId") REFERENCES "public"."pipeline_extraction_evidence"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_curriculum_version" ADD CONSTRAINT "pipeline_curriculum_version_programId_pipeline_program_id_fk" FOREIGN KEY ("programId") REFERENCES "public"."pipeline_program"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_curriculum_version" ADD CONSTRAINT "pipeline_curriculum_version_sourceId_pipeline_source_id_fk" FOREIGN KEY ("sourceId") REFERENCES "public"."pipeline_source"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_document" ADD CONSTRAINT "pipeline_document_sourceId_pipeline_source_id_fk" FOREIGN KEY ("sourceId") REFERENCES "public"."pipeline_source"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_extraction_evidence" ADD CONSTRAINT "pipeline_extraction_evidence_documentId_pipeline_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."pipeline_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_extraction_evidence" ADD CONSTRAINT "pipeline_extraction_evidence_extractionRunId_pipeline_extraction_run_id_fk" FOREIGN KEY ("extractionRunId") REFERENCES "public"."pipeline_extraction_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_extraction_run" ADD CONSTRAINT "pipeline_extraction_run_documentId_pipeline_document_id_fk" FOREIGN KEY ("documentId") REFERENCES "public"."pipeline_document"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_program" ADD CONSTRAINT "pipeline_program_universityId_pipeline_university_id_fk" FOREIGN KEY ("universityId") REFERENCES "public"."pipeline_university"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_review_queue" ADD CONSTRAINT "pipeline_review_queue_curriculumVersionId_pipeline_curriculum_version_id_fk" FOREIGN KEY ("curriculumVersionId") REFERENCES "public"."pipeline_curriculum_version"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_review_queue" ADD CONSTRAINT "pipeline_review_queue_extractionRunId_pipeline_extraction_run_id_fk" FOREIGN KEY ("extractionRunId") REFERENCES "public"."pipeline_extraction_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_review_queue" ADD CONSTRAINT "pipeline_review_queue_reviewedBy_user_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_source" ADD CONSTRAINT "pipeline_source_universityId_pipeline_university_id_fk" FOREIGN KEY ("universityId") REFERENCES "public"."pipeline_university"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_source" ADD CONSTRAINT "pipeline_source_programId_pipeline_program_id_fk" FOREIGN KEY ("programId") REFERENCES "public"."pipeline_program"("id") ON DELETE cascade ON UPDATE no action;
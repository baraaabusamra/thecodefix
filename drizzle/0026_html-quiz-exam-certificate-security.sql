CREATE TYPE "public"."certificate_status" AS ENUM('valid', 'revoked');--> statement-breakpoint
CREATE TYPE "public"."quiz_attempt_status" AS ENUM('in_progress', 'graded');--> statement-breakpoint
CREATE TABLE "exam_attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"track" text NOT NULL,
	"questionIds" text NOT NULL,
	"optionOrder" text NOT NULL,
	"answers" text DEFAULT '{}' NOT NULL,
	"status" "quiz_attempt_status" DEFAULT 'in_progress' NOT NULL,
	"score" integer,
	"total" integer DEFAULT 40 NOT NULL,
	"passed" boolean,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"submittedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "lesson_quiz_attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"track" text NOT NULL,
	"lessonSlug" text NOT NULL,
	"questionIds" text NOT NULL,
	"optionOrder" text NOT NULL,
	"answers" text DEFAULT '{}' NOT NULL,
	"status" "quiz_attempt_status" DEFAULT 'in_progress' NOT NULL,
	"score" integer,
	"total" integer DEFAULT 5 NOT NULL,
	"passed" boolean,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"submittedAt" timestamp
);
--> statement-breakpoint
ALTER TABLE "certificate" ADD COLUMN "status" "certificate_status" DEFAULT 'valid' NOT NULL;--> statement-breakpoint
ALTER TABLE "certificate" ADD COLUMN "examAttemptId" text;--> statement-breakpoint
WITH ranked_certificates AS (
	SELECT "id", ROW_NUMBER() OVER (
		PARTITION BY "userId", "track"
		ORDER BY "issuedAt" DESC, "id" DESC
	) AS certificate_rank
	FROM "certificate"
	WHERE "userId" IS NOT NULL
)
UPDATE "certificate" AS certificate_row
SET "status" = 'revoked'
FROM ranked_certificates
WHERE certificate_row."id" = ranked_certificates."id"
	AND ranked_certificates.certificate_rank > 1;--> statement-breakpoint
ALTER TABLE "exam_attempt" ADD CONSTRAINT "exam_attempt_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_quiz_attempt" ADD CONSTRAINT "lesson_quiz_attempt_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_examAttemptId_exam_attempt_id_fk" FOREIGN KEY ("examAttemptId") REFERENCES "public"."exam_attempt"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "exam_attempt_user_track_idx" ON "exam_attempt" USING btree ("userId","track");--> statement-breakpoint
CREATE INDEX "exam_attempt_user_track_status_idx" ON "exam_attempt" USING btree ("userId","track","status");--> statement-breakpoint
CREATE UNIQUE INDEX "exam_attempt_one_in_progress_per_track" ON "exam_attempt" USING btree ("userId","track") WHERE "exam_attempt"."status" = 'in_progress';--> statement-breakpoint
CREATE INDEX "lesson_quiz_attempt_user_lesson_idx" ON "lesson_quiz_attempt" USING btree ("userId","track","lessonSlug");--> statement-breakpoint
CREATE UNIQUE INDEX "lesson_quiz_attempt_one_in_progress_per_lesson" ON "lesson_quiz_attempt" USING btree ("userId","track","lessonSlug") WHERE "lesson_quiz_attempt"."status" = 'in_progress';--> statement-breakpoint
CREATE UNIQUE INDEX "certificate_one_valid_per_user_track" ON "certificate" USING btree ("userId","track") WHERE "certificate"."status" = 'valid';

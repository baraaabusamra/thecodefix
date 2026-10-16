ALTER TABLE "academic_study_plan" ALTER COLUMN "totalCreditHours" SET DATA TYPE numeric(5, 1);--> statement-breakpoint
ALTER TABLE "pipeline_curriculum_course" ALTER COLUMN "credits" SET DATA TYPE numeric(4, 1);--> statement-breakpoint
ALTER TABLE "pipeline_curriculum_course" ALTER COLUMN "theoreticalCredits" SET DATA TYPE numeric(4, 1);--> statement-breakpoint
ALTER TABLE "pipeline_curriculum_course" ALTER COLUMN "practicalCredits" SET DATA TYPE numeric(4, 1);
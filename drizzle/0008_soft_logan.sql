CREATE TYPE "public"."report_category" AS ENUM('social_media', 'podcast', 'event', 'photography', 'content_writing', 'design', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'marketing' BEFORE 'admin';--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'designer' BEFORE 'admin';--> statement-breakpoint
CREATE TABLE "work_report" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"category" "report_category" NOT NULL,
	"title" text NOT NULL,
	"details" text NOT NULL,
	"links" text,
	"workDate" timestamp DEFAULT now() NOT NULL,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"reviewNote" text,
	"reviewedBy" text,
	"reviewedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_report" ADD CONSTRAINT "work_report_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_report" ADD CONSTRAINT "work_report_reviewedBy_user_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
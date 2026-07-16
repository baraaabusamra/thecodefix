CREATE TYPE "public"."outreach_guide" AS ENUM('funding', 'instructors');--> statement-breakpoint
CREATE TYPE "public"."outreach_status" AS ENUM('todo', 'contacted', 'replied', 'done', 'rejected');--> statement-breakpoint
CREATE TABLE "outreach_contact" (
	"id" text PRIMARY KEY NOT NULL,
	"guide" "outreach_guide" NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"url" text,
	"status" "outreach_status" DEFAULT 'todo' NOT NULL,
	"report" text,
	"updatedBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "outreach_contact" ADD CONSTRAINT "outreach_contact_updatedBy_user_id_fk" FOREIGN KEY ("updatedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
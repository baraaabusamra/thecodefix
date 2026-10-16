CREATE TYPE "public"."instructor_status" AS ENUM('contacting', 'signed', 'active', 'paused');--> statement-breakpoint
CREATE TYPE "public"."lesson_status" AS ENUM('draft', 'review', 'published', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."ticket_priority" AS ENUM('low', 'normal', 'high');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('new', 'in_progress', 'closed');--> statement-breakpoint
ALTER TYPE "public"."user_role" ADD VALUE 'operations' BEFORE 'admin';--> statement-breakpoint
CREATE TABLE "instructor_track" (
	"id" text PRIMARY KEY NOT NULL,
	"instructorId" text NOT NULL,
	"track" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "instructor_track_unique" UNIQUE("instructorId","track")
);
--> statement-breakpoint
CREATE TABLE "instructor" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"specialty" text DEFAULT '' NOT NULL,
	"status" "instructor_status" DEFAULT 'contacting' NOT NULL,
	"email" text,
	"phone" text,
	"notes" text,
	"contractUrl" text,
	"payoutMethod" text,
	"bankDetails" text,
	"lastContentAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_reply" (
	"id" text PRIMARY KEY NOT NULL,
	"ticketId" text NOT NULL,
	"authorId" text,
	"body" text NOT NULL,
	"internal" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket" (
	"id" text PRIMARY KEY NOT NULL,
	"subject" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"userId" text,
	"requesterEmail" text,
	"priority" "ticket_priority" DEFAULT 'normal' NOT NULL,
	"status" "ticket_status" DEFAULT 'new' NOT NULL,
	"assigneeId" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "content_lesson" ADD COLUMN "status" "lesson_status" DEFAULT 'published' NOT NULL;--> statement-breakpoint
ALTER TABLE "content_lesson" ADD COLUMN "reviewNotes" text;--> statement-breakpoint
ALTER TABLE "instructor_track" ADD CONSTRAINT "instructor_track_instructorId_instructor_id_fk" FOREIGN KEY ("instructorId") REFERENCES "public"."instructor"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_reply" ADD CONSTRAINT "ticket_reply_ticketId_ticket_id_fk" FOREIGN KEY ("ticketId") REFERENCES "public"."ticket"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_reply" ADD CONSTRAINT "ticket_reply_authorId_user_id_fk" FOREIGN KEY ("authorId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_assigneeId_user_id_fk" FOREIGN KEY ("assigneeId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
UPDATE "content_lesson" SET "status" = 'draft' WHERE "published" = false;
CREATE TYPE "public"."creator_platform" AS ENUM('youtube', 'instagram', 'tiktok', 'facebook');--> statement-breakpoint
CREATE TABLE "comment" (
	"id" text PRIMARY KEY NOT NULL,
	"track" text NOT NULL,
	"lesson" text NOT NULL,
	"parentId" text,
	"userId" text,
	"authorName" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"upvotes" integer DEFAULT 0 NOT NULL,
	"isApproved" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "daily_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"date" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "daily_activity_userId_date_unique" UNIQUE("userId","date")
);
--> statement-breakpoint
CREATE TABLE "quiz_attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"track" text NOT NULL,
	"questionId" text,
	"selected" integer NOT NULL,
	"correct" boolean NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quiz_question" (
	"id" text PRIMARY KEY NOT NULL,
	"track" text NOT NULL,
	"question" text NOT NULL,
	"options" text NOT NULL,
	"answer" integer NOT NULL,
	"explain" text NOT NULL,
	"difficulty" integer DEFAULT 1 NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_submission" (
	"id" text PRIMARY KEY NOT NULL,
	"creatorId" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"platform" "creator_platform" NOT NULL,
	"videoUrl" text NOT NULL,
	"thumbnail" text,
	"duration" integer,
	"hashtags" text DEFAULT '',
	"status" "submission_status" DEFAULT 'pending' NOT NULL,
	"reviewedBy" text,
	"reviewNote" text,
	"reviewedAt" timestamp,
	"publishedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "creator" DROP CONSTRAINT "creator_displayName_unique";--> statement-breakpoint
ALTER TABLE "creator" ADD COLUMN "platforms" text DEFAULT '[]' NOT NULL;--> statement-breakpoint
ALTER TABLE "comment" ADD CONSTRAINT "comment_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_activity" ADD CONSTRAINT "daily_activity_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quiz_attempt" ADD CONSTRAINT "quiz_attempt_questionId_quiz_question_id_fk" FOREIGN KEY ("questionId") REFERENCES "public"."quiz_question"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_submission" ADD CONSTRAINT "video_submission_creatorId_creator_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_submission" ADD CONSTRAINT "video_submission_reviewedBy_user_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comment_lesson_idx" ON "comment" USING btree ("track","lesson");--> statement-breakpoint
CREATE INDEX "comment_moderation_idx" ON "comment" USING btree ("isApproved");--> statement-breakpoint
CREATE INDEX "quiz_attempt_user_track_idx" ON "quiz_attempt" USING btree ("userId","track");--> statement-breakpoint
CREATE INDEX "quiz_question_track_idx" ON "quiz_question" USING btree ("track");--> statement-breakpoint
CREATE INDEX "video_submission_status_idx" ON "video_submission" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_submission_creator_id_idx" ON "video_submission" USING btree ("creatorId");--> statement-breakpoint
ALTER TABLE "creator" ADD CONSTRAINT "creator_userId_unique" UNIQUE("userId");
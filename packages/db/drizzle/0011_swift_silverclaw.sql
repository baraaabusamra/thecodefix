CREATE TYPE "public"."creator_platform" AS ENUM('youtube', 'instagram', 'tiktok', 'facebook');--> statement-breakpoint
CREATE TYPE "public"."submission_status" AS ENUM('pending', 'approved', 'rejected', 'needs_revision');--> statement-breakpoint
CREATE TABLE "creator" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"displayName" text NOT NULL,
	"bio" text,
	"avatar" text,
	"website" text,
	"platforms" text DEFAULT '[]' NOT NULL,
	"socialLinks" text DEFAULT '{}',
	"status" text DEFAULT 'active' NOT NULL,
	"totalSubmissions" integer DEFAULT 0 NOT NULL,
	"approvedSubmissions" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "creator_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "notification" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
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
ALTER TABLE "creator" ADD CONSTRAINT "creator_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_submission" ADD CONSTRAINT "video_submission_creatorId_creator_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_submission" ADD CONSTRAINT "video_submission_reviewedBy_user_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_user_read_idx" ON "notification" USING btree ("userId","read");--> statement-breakpoint
CREATE INDEX "video_submission_status_idx" ON "video_submission" USING btree ("status");--> statement-breakpoint
CREATE INDEX "video_submission_creator_id_idx" ON "video_submission" USING btree ("creatorId");
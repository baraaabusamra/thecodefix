-- Multi-page creators (a user account can own more than one creator page,
-- like a LinkedIn personal profile owning several Company Pages) + generic
-- posts (text + optional image + optional link) instead of video-only
-- submissions restricted to 4 platforms.
--
-- Hand-written (not drizzle-kit generated) because the rename from
-- video_submission -> post plus column renames triggered drizzle-kit's
-- interactive rename-vs-recreate prompt, which needs a TTY this environment
-- doesn't have. Both tables are brand new from migration 0011 with zero
-- production rows, so a clean drop+recreate is safe here.

ALTER TABLE "creator" DROP CONSTRAINT IF EXISTS "creator_userId_unique";--> statement-breakpoint
ALTER TABLE "creator" ADD CONSTRAINT "creator_displayName_unique" UNIQUE("displayName");--> statement-breakpoint
ALTER TABLE "creator" DROP COLUMN IF EXISTS "platforms";--> statement-breakpoint

DROP TABLE IF EXISTS "video_submission";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."creator_platform";--> statement-breakpoint

CREATE TABLE "post" (
	"id" text PRIMARY KEY NOT NULL,
	"creatorId" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"imageUrl" text,
	"link" text,
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
ALTER TABLE "post" ADD CONSTRAINT "post_creatorId_creator_id_fk" FOREIGN KEY ("creatorId") REFERENCES "public"."creator"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "post" ADD CONSTRAINT "post_reviewedBy_user_id_fk" FOREIGN KEY ("reviewedBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "post_status_idx" ON "post" USING btree ("status");--> statement-breakpoint
CREATE INDEX "post_creator_id_idx" ON "post" USING btree ("creatorId");

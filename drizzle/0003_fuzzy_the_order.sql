CREATE TABLE "seo_keyword" (
	"id" text PRIMARY KEY NOT NULL,
	"keyword" text NOT NULL,
	"targetPath" text,
	"position" integer,
	"targetPosition" integer DEFAULT 3 NOT NULL,
	"notes" text,
	"createdBy" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "seo_keyword" ADD CONSTRAINT "seo_keyword_createdBy_user_id_fk" FOREIGN KEY ("createdBy") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
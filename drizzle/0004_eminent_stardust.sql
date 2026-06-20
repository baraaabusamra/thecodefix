CREATE TABLE "content_lesson" (
	"id" text PRIMARY KEY NOT NULL,
	"track" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"order" integer DEFAULT 100 NOT NULL,
	"keywords" text,
	"content" text DEFAULT '' NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "content_lesson_track_slug" UNIQUE("track","slug")
);
--> statement-breakpoint
CREATE TABLE "content_track" (
	"slug" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"icon" text DEFAULT '📦' NOT NULL,
	"color" text DEFAULT '#B026FF' NOT NULL,
	"order" integer DEFAULT 100 NOT NULL,
	"published" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "lesson_completion" (
	"userId" text NOT NULL,
	"track" text NOT NULL,
	"lessonSlug" text NOT NULL,
	"completedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_completion_userId_track_lessonSlug_pk" PRIMARY KEY("userId","track","lessonSlug")
);
--> statement-breakpoint
ALTER TABLE "user_progress" ADD COLUMN "completionsImportedAt" timestamp;--> statement-breakpoint
ALTER TABLE "lesson_completion" ADD CONSTRAINT "lesson_completion_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
CREATE TABLE "user_progress" (
	"userId" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"data" text DEFAULT '{}' NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_progress" ADD CONSTRAINT "user_progress_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
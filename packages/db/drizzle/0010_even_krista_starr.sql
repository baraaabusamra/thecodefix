CREATE TABLE "league_snapshot" (
	"id" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"weekStart" text NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "league_snapshot_userId_weekStart_unique" UNIQUE("userId","weekStart")
);
--> statement-breakpoint
ALTER TABLE "league_snapshot" ADD CONSTRAINT "league_snapshot_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
CREATE TABLE "certificate" (
	"id" text PRIMARY KEY NOT NULL,
	"certId" text NOT NULL,
	"userId" text,
	"recipientName" text NOT NULL,
	"track" text NOT NULL,
	"trackTitle" text NOT NULL,
	"score" integer NOT NULL,
	"total" integer NOT NULL,
	"issuedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "certificate_certId_unique" UNIQUE("certId")
);
--> statement-breakpoint
ALTER TABLE "certificate" ADD CONSTRAINT "certificate_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
CREATE TABLE "job_alert" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"country" text NOT NULL,
	"specialty" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "job_alert_email_country_unique" UNIQUE("email","country")
);
--> statement-breakpoint
CREATE INDEX "job_alert_country_idx" ON "job_alert" USING btree ("country");
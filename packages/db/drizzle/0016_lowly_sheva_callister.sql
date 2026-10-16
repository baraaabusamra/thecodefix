CREATE TABLE "academic_study_plan" (
	"id" text PRIMARY KEY NOT NULL,
	"country" text NOT NULL,
	"university" text NOT NULL,
	"specialization" text NOT NULL,
	"programNameEn" text DEFAULT '' NOT NULL,
	"degree" text DEFAULT 'بكالوريوس' NOT NULL,
	"totalCreditHours" integer DEFAULT 0 NOT NULL,
	"source" text DEFAULT '' NOT NULL,
	"sourceDate" text DEFAULT '' NOT NULL,
	"generalNote" text,
	"categories" text DEFAULT '[]' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "academic_study_plan_key" UNIQUE("country","university","specialization")
);

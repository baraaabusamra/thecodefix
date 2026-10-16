// Jobs board: lead capture for real job postings.
//
// Extracted from the single packages/db/src/schema.ts in Phase 2. That file is still
// the public entry point. No table, column, SQL type, default, index,
// constraint or enum value changed in the move.

import {
  pgTable,
  text,
  timestamp,
  unique,
  index,
} from "drizzle-orm/pg-core";

// ── Job alerts (لوحة الوظائف) ─────────────────────────────────────────
// Lead capture for real job postings: a visitor leaves their email for a
// country (+ optional specialty) and gets notified when a real listing goes
// up. The country/specialty page still works with zero rows — this just
// builds an audience list that makes real employer outreach easier ("we
// already have N developers waiting for Flutter jobs in Egypt").
export const jobAlerts = pgTable(
  "job_alert",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull(),
    country: text("country").notNull(), // Country.slug from lib/job-search.ts
    specialty: text("specialty"), // Specialty.slug from lib/job-search.ts, optional
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    unique("job_alert_email_country_unique").on(t.email, t.country),
    index("job_alert_country_idx").on(t.country),
  ]
);
export type JobAlert = typeof jobAlerts.$inferSelect;
export type NewJobAlert = typeof jobAlerts.$inferInsert;

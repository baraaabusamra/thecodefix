// Certificates: verifiable records of a passed final exam.
//
// Extracted from the single packages/db/src/schema.ts in Phase 2. That file is still
// the public entry point. No table, column, SQL type, default, index,
// constraint or enum value changed in the move.

import {
  pgTable,
  pgEnum,
  text,
  integer,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { examAttempts } from "./assessments";
import { users } from "./auth";

// ── Certificates ─────────────────────────────────────────────────────
// A verifiable record of a passed track quiz. `certId` is the public code
// printed on the certificate; the /verify page and admin dashboard look it up.
//
// `status`/`examAttemptId` are additive (nullable-with-default) so existing
// rows — issued under the old client-reported-score flow, certId format
// `TCF-<TRACK>-<base36 timestamp>` — stay valid untouched. New issuances
// (server-graded tracks only, see examAttempts below) get a cryptographically
// random certId (`TCF-<uuid>`) generated server-side and set examAttemptId.
export const certificateStatus = pgEnum("certificate_status", [
  "valid",
  "revoked",
]);

export const certificates = pgTable(
  "certificate",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    certId: text("certId").notNull().unique(),
    userId: text("userId").references(() => users.id, { onDelete: "set null" }),
    recipientName: text("recipientName").notNull(),
    track: text("track").notNull(),
    trackTitle: text("trackTitle").notNull(),
    score: integer("score").notNull(),
    total: integer("total").notNull(),
    issuedAt: timestamp("issuedAt", { mode: "date" }).notNull().defaultNow(),
    status: certificateStatus("status").notNull().default("valid"),
    // Set only for certificates issued via the new server-graded exam flow;
    // null for legacy certificates and for tracks still on the old flow.
    examAttemptId: text("examAttemptId").references(() => examAttempts.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    // Preserve historical certificate URLs after revocation, while allowing
    // exactly one currently valid certificate per signed-in user and track.
    // NULL userId rows (legacy/orphaned via onDelete:"set null") remain exempt.
    uniqueIndex("certificate_one_valid_per_user_track")
      .on(t.userId, t.track)
      .where(sql`${t.status} = 'valid'`),
  ]
);

export type Certificate = typeof certificates.$inferSelect;

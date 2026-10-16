// Learner progression: per-user progress, per-lesson completions, and the
// weekly leaderboard baseline snapshots derived from them.
//
// Extracted from the single packages/db/src/schema.ts in Phase 2. That file is still
// the public entry point. No table, column, SQL type, default, index,
// constraint or enum value changed in the move.

import {
  pgTable,
  text,
  integer,
  timestamp,
  primaryKey,
  unique,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

// ── Student progress (synced across devices for signed-in users) ─────
// One row per user holding the same shape as the old localStorage store
// (name + completed lessons + best quiz results) as a JSON blob.
export const userProgress = pgTable("user_progress", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  // LEGACY, browser-reported JSON { completedLessons, quizzes }. No longer
  // written: lessons now live in lesson_completion (server-owned) and quiz
  // results come from server-graded attempts. Read once per user to import
  // completed lessons (see completionsImportedAt).
  data: text("data").notNull().default("{}"),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  // Set once `data.completedLessons` has been imported into lesson_completion.
  completionsImportedAt: timestamp("completionsImportedAt", { mode: "date" }),
});

// ── Lesson completions (server-owned learning record) ─────────────────
// One row per (user, track, lesson). The composite primary key makes
// "mark complete" idempotent and makes duplicate counting impossible at the
// database level. Rows are only written by server actions that validated
// the track/lesson against real content.
export const lessonCompletions = pgTable(
  "lesson_completion",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    track: text("track").notNull(),
    lessonSlug: text("lessonSlug").notNull(),
    completedAt: timestamp("completedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.track, t.lessonSlug] })]
);

export type UserProgress = typeof userProgress.$inferSelect;
// ── Weekly league snapshots (اللوحة والدوري الأسبوعي) ────────────────
// Lazy weekly baseline: the first leaderboard read of a week inserts each
// user's current total points as that week's snapshot; weekly points are
// (current total − snapshot). No cron needed — the week "resets" on first
// read after Monday 00:00 UTC.
export const leagueSnapshots = pgTable(
  "league_snapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekStart: text("weekStart").notNull(), // "YYYY-MM-DD" (Monday, UTC)
    points: integer("points").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.weekStart)]
);

// Server-graded assessments. These tables are the SERVER-TRUSTED record of
// what a learner scored: rows are written only by server actions that grade
// against a server-held answer key. Client-reported scores never land here.
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
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./auth";

// ── Lesson quizzes & the per-track final exam ─────────────────────────
// Server-graded, per-attempt tracking. Question banks (text + correct answer
// + explanation) live as server-only JSON files under content/ar/quiz-bank/
// (never imported by any "use client" file — see modules/assessment/src/quiz-bank.ts), so
// these rows only ever hold WHICH question ids were shown (in what shuffled
// order) and WHAT the learner answered — never the questions/answers
// themselves. Grading always re-derives correctness from the bank at submit
// time; a client-reported score is never trusted (see
// docs/html-quiz-security.md for the full threat model).
export const quizAttemptStatus = pgEnum("quiz_attempt_status", [
  "in_progress",
  "graded",
]);

// One row per lesson-quiz attempt (5 questions, pass = 4/5). No separate
// "lesson complete" flag: a lesson counts as passed iff a graded, passed
// attempt exists for (userId, track, lessonSlug) — derived, not stored, so
// there is exactly one source of truth.
export const lessonQuizAttempts = pgTable(
  "lesson_quiz_attempt",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    track: text("track").notNull(),
    lessonSlug: text("lessonSlug").notNull(),
    questionIds: text("questionIds").notNull(), // JSON string[] — snapshot, shown order
    optionOrder: text("optionOrder").notNull(), // JSON { [questionId]: number[] } shuffled option->original index
    answers: text("answers").notNull().default("{}"), // JSON { [questionId]: number } selected option index
    status: quizAttemptStatus("status").notNull().default("in_progress"),
    score: integer("score"), // set on grading
    total: integer("total").notNull().default(5),
    passed: boolean("passed"), // set on grading
    startedAt: timestamp("startedAt", { mode: "date" }).notNull().defaultNow(),
    submittedAt: timestamp("submittedAt", { mode: "date" }),
  },
  (t) => [
    index("lesson_quiz_attempt_user_lesson_idx").on(
      t.userId,
      t.track,
      t.lessonSlug
    ),
    uniqueIndex("lesson_quiz_attempt_one_in_progress_per_lesson")
      .on(t.userId, t.track, t.lessonSlug)
      .where(sql`${t.status} = 'in_progress'`),
  ]
);

// One row per final-exam attempt (40 questions from an 80+ bank, pass =
// 32/40). `expiresAt` is the server-enforced 50-minute deadline set at start;
// `answers` is updated incrementally by autosave while in_progress. An
// in_progress row past `expiresAt` is lazily graded (whatever was
// autosaved) the next time it's read/acted on — see
// src/app/exam/[tech]/actions.ts.
export const examAttempts = pgTable(
  "exam_attempt",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    track: text("track").notNull(),
    questionIds: text("questionIds").notNull(), // JSON string[] — snapshot, 40 ids
    optionOrder: text("optionOrder").notNull(), // JSON { [questionId]: number[] }
    answers: text("answers").notNull().default("{}"), // JSON { [questionId]: number }
    status: quizAttemptStatus("status").notNull().default("in_progress"),
    score: integer("score"),
    total: integer("total").notNull().default(40),
    passed: boolean("passed"),
    startedAt: timestamp("startedAt", { mode: "date" }).notNull().defaultNow(),
    expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
    submittedAt: timestamp("submittedAt", { mode: "date" }),
  },
  (t) => [
    index("exam_attempt_user_track_idx").on(t.userId, t.track),
    index("exam_attempt_user_track_status_idx").on(
      t.userId,
      t.track,
      t.status
    ),
    uniqueIndex("exam_attempt_one_in_progress_per_track")
      .on(t.userId, t.track)
      .where(sql`${t.status} = 'in_progress'`),
  ]
);

export type LessonQuizAttempt = typeof lessonQuizAttempts.$inferSelect;
export type ExamAttempt = typeof examAttempts.$inferSelect;

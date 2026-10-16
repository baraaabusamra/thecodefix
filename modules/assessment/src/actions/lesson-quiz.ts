"use server";

import { eq, and } from "drizzle-orm";
import { auth } from "@tcf/identity/auth";
import { db } from "@tcf/db";
import { lessonQuizAttempts } from "@tcf/db/schema";
import {
  getLessonQuestionPool,
  pickAndSanitize,
  reconstructSanitized,
  grade,
  type SanitizedQuestion,
  type GradedQuestion,
} from "../quiz-bank";
import { isRequiredLesson } from "../requirements";
import { rateLimit } from "@tcf/core/rate-limit";
import { isUniqueViolation } from "@tcf/db/errors";

const QUESTIONS_PER_ATTEMPT = 5;
const PASS_THRESHOLD = 4; // out of 5
const ACTIVE_LESSON_ATTEMPT_INDEX =
  "lesson_quiz_attempt_one_in_progress_per_lesson";

function isActiveLessonAttemptConflict(error: unknown): boolean {
  return isUniqueViolation(error, ACTIVE_LESSON_ATTEMPT_INDEX);
}

export type StartLessonQuizResult =
  | { ok: true; attemptId: string; questions: SanitizedQuestion[] }
  | { ok: false; reason: "unauthenticated" | "unavailable" | "rate_limited" };

/**
 * Starts (or resumes, if one is already in progress) a lesson quiz attempt.
 * Server picks the questions and shuffles both question and option order —
 * the client never sees `answer` or `explain` until after submit.
 */
export async function startLessonQuiz(
  track: string,
  lessonSlug: string
): Promise<StartLessonQuizResult> {
  if (!db) return { ok: false, reason: "unavailable" };
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, reason: "unauthenticated" };
  if (!isRequiredLesson(track, lessonSlug)) return { ok: false, reason: "unavailable" };
  if (!rateLimit(`lesson-quiz-start:${userId}`, 30, 60 * 1000)) {
    return { ok: false, reason: "rate_limited" };
  }

  const pool = getLessonQuestionPool(track, lessonSlug);
  if (pool.length === 0) return { ok: false, reason: "unavailable" };

  // Resume an existing in-progress attempt instead of spawning another.
  const existing = await db
    .select()
    .from(lessonQuizAttempts)
    .where(
      and(
        eq(lessonQuizAttempts.userId, userId),
        eq(lessonQuizAttempts.track, track),
        eq(lessonQuizAttempts.lessonSlug, lessonSlug),
        eq(lessonQuizAttempts.status, "in_progress")
      )
    )
    .limit(1);

  if (existing[0]) {
    const row = existing[0];
    const questionIds = JSON.parse(row.questionIds) as string[];
    const optionOrder = JSON.parse(row.optionOrder) as Record<string, number[]>;
    return {
      ok: true,
      attemptId: row.id,
      questions: reconstructSanitized(pool, questionIds, optionOrder),
    };
  }

  const { questionIds, optionOrder, sanitized } = pickAndSanitize(
    pool,
    QUESTIONS_PER_ATTEMPT
  );

  try {
    const [inserted] = await db
      .insert(lessonQuizAttempts)
      .values({
        userId,
        track,
        lessonSlug,
        questionIds: JSON.stringify(questionIds),
        optionOrder: JSON.stringify(optionOrder),
        total: sanitized.length,
      })
      .returning({ id: lessonQuizAttempts.id });

    return { ok: true, attemptId: inserted.id, questions: sanitized };
  } catch (error: unknown) {
    if (!isActiveLessonAttemptConflict(error)) throw error;

    // A concurrent request won the insert. The partial unique index is the
    // authority; this lookup only returns the winning attempt to the caller.
    const concurrent = await db
      .select()
      .from(lessonQuizAttempts)
      .where(
        and(
          eq(lessonQuizAttempts.userId, userId),
          eq(lessonQuizAttempts.track, track),
          eq(lessonQuizAttempts.lessonSlug, lessonSlug),
          eq(lessonQuizAttempts.status, "in_progress")
        )
      )
      .limit(1);
    const winner = concurrent[0];
    if (!winner) throw error;
    return {
      ok: true,
      attemptId: winner.id,
      questions: reconstructSanitized(
        pool,
        JSON.parse(winner.questionIds) as string[],
        JSON.parse(winner.optionOrder) as Record<string, number[]>
      ),
    };
  }
}

export type SubmitLessonQuizResult =
  | {
      ok: true;
      score: number;
      total: number;
      passed: boolean;
      results: GradedQuestion[];
    }
  | { ok: false; reason: "unauthenticated" | "not_found" | "already_graded" | "rate_limited" };

export async function submitLessonQuiz(
  attemptId: string,
  answers: Record<string, number>
): Promise<SubmitLessonQuizResult> {
  if (!db) return { ok: false, reason: "not_found" };
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, reason: "unauthenticated" };
  if (!rateLimit(`lesson-quiz-submit:${userId}`, 30, 60 * 1000)) {
    return { ok: false, reason: "rate_limited" };
  }

  const rows = await db
    .select()
    .from(lessonQuizAttempts)
    .where(eq(lessonQuizAttempts.id, attemptId))
    .limit(1);
  const attempt = rows[0];
  // Ownership check — an attempt id belonging to another user must never be
  // gradable or readable through this action.
  if (!attempt || attempt.userId !== userId) return { ok: false, reason: "not_found" };
  if (attempt.status !== "in_progress") return { ok: false, reason: "already_graded" };

  const pool = getLessonQuestionPool(attempt.track, attempt.lessonSlug);
  const questionIds = JSON.parse(attempt.questionIds) as string[];
  const optionOrder = JSON.parse(attempt.optionOrder) as Record<string, number[]>;
  const safeAnswers: Record<string, number> = {};
  for (const [k, v] of Object.entries(answers ?? {})) {
    if (questionIds.includes(k) && typeof v === "number" && Number.isInteger(v)) {
      safeAnswers[k] = v;
    }
  }

  const { score, total, results } = grade(pool, questionIds, optionOrder, safeAnswers);
  const passed = score >= PASS_THRESHOLD;

  // Only an in-progress attempt can be graded, atomically: a concurrent or
  // replayed submit can't overwrite a stored grade with different answers.
  const [graded] = await db
    .update(lessonQuizAttempts)
    .set({
      answers: JSON.stringify(safeAnswers),
      status: "graded",
      score,
      passed,
      submittedAt: new Date(),
    })
    .where(and(eq(lessonQuizAttempts.id, attemptId), eq(lessonQuizAttempts.status, "in_progress")))
    .returning({ id: lessonQuizAttempts.id });
  if (!graded) return { ok: false, reason: "already_graded" };

  return { ok: true, score, total, passed, results };
}

export type LessonQuizStatus = {
  attempted: boolean;
  passed: boolean;
  bestScore: number | null;
  total: number;
  attempts: number;
};

/** Read-only status for the lesson page UI — best score wins, all derived from real graded attempts. */
export async function getMyLessonQuizStatus(
  track: string,
  lessonSlug: string
): Promise<LessonQuizStatus> {
  const empty: LessonQuizStatus = {
    attempted: false,
    passed: false,
    bestScore: null,
    total: QUESTIONS_PER_ATTEMPT,
    attempts: 0,
  };
  if (!db) return empty;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return empty;

  const rows = await db
    .select()
    .from(lessonQuizAttempts)
    .where(
      and(
        eq(lessonQuizAttempts.userId, userId),
        eq(lessonQuizAttempts.track, track),
        eq(lessonQuizAttempts.lessonSlug, lessonSlug),
        eq(lessonQuizAttempts.status, "graded")
      )
    );

  if (rows.length === 0) return empty;
  const bestScore = Math.max(...rows.map((r) => r.score ?? 0));
  return {
    attempted: true,
    passed: rows.some((r) => r.passed),
    bestScore,
    total: rows[0].total,
    attempts: rows.length,
  };
}

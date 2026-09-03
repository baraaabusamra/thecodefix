"use server";

import { eq, and, gte } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { examAttempts, lessonQuizAttempts } from "@/db/schema";
import {
  getExamQuestionPool,
  pickAndSanitize,
  reconstructSanitized,
  grade,
  type SanitizedQuestion,
  type GradedQuestion,
} from "@/lib/quiz-bank";
import { getRequiredLessons } from "@/lib/quiz-requirements";
import { rateLimit } from "@/lib/rate-limit";

const EXAM_QUESTIONS = 40;
const EXAM_PASS = 32; // out of 40
const EXAM_DURATION_MS = 50 * 60 * 1000; // 50 minutes, server-enforced
const MAX_FAILED_ATTEMPTS_PER_WINDOW = 3;
const FAILED_ATTEMPT_WINDOW_MS = 24 * 60 * 60 * 1000; // rolling 24h
const ACTIVE_EXAM_ATTEMPT_INDEX =
  "exam_attempt_one_in_progress_per_track";

function isActiveExamAttemptConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "NeonDbError" &&
    (error as { code?: unknown }).code === "23505" &&
    (error as { constraint?: unknown }).constraint ===
      ACTIVE_EXAM_ATTEMPT_INDEX
  );
}

// ── Eligibility ─────────────────────────────────────────────────────────

export type ExamEligibility =
  | { eligible: true }
  | { eligible: false; reason: "unauthenticated" | "unavailable" }
  | { eligible: false; reason: "missing_lessons"; missing: string[] };

export async function getExamEligibility(track: string): Promise<ExamEligibility> {
  if (!db) return { eligible: false, reason: "unavailable" };
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { eligible: false, reason: "unauthenticated" };

  const required = getRequiredLessons(track);
  if (required.length === 0) return { eligible: false, reason: "unavailable" };

  const passedRows = await db
    .select({ lessonSlug: lessonQuizAttempts.lessonSlug })
    .from(lessonQuizAttempts)
    .where(
      and(
        eq(lessonQuizAttempts.userId, userId),
        eq(lessonQuizAttempts.track, track),
        eq(lessonQuizAttempts.status, "graded"),
        eq(lessonQuizAttempts.passed, true)
      )
    );
  const passedSet = new Set(passedRows.map((r) => r.lessonSlug));
  const missing = required.filter((slug) => !passedSet.has(slug));
  if (missing.length > 0) return { eligible: false, reason: "missing_lessons", missing };
  return { eligible: true };
}

// ── Lazily finalize an expired in-progress attempt ───────────────────────

async function finalizeIfExpired(attempt: typeof examAttempts.$inferSelect) {
  if (!db) return attempt;
  if (attempt.status !== "in_progress") return attempt;
  if (Date.now() <= attempt.expiresAt.getTime()) return attempt;

  const pool = getExamQuestionPool(attempt.track);
  const questionIds = JSON.parse(attempt.questionIds) as string[];
  const optionOrder = JSON.parse(attempt.optionOrder) as Record<string, number[]>;
  const answers = JSON.parse(attempt.answers) as Record<string, number>;
  const { score, total } = grade(pool, questionIds, optionOrder, answers);
  const passed = score >= EXAM_PASS;

  await db
    .update(examAttempts)
    .set({ status: "graded", score, total, passed, submittedAt: attempt.expiresAt })
    .where(eq(examAttempts.id, attempt.id));

  return { ...attempt, status: "graded" as const, score, passed, submittedAt: attempt.expiresAt };
}

// ── Start / resume ───────────────────────────────────────────────────────

export type StartExamResult =
  | {
      ok: true;
      attemptId: string;
      questions: SanitizedQuestion[];
      expiresAt: string; // ISO — client computes its own countdown, but the
      // server is the only one that enforces it
      answers: Record<string, number>; // previously autosaved answers, for resume
    }
  | { ok: false; reason: "unauthenticated" | "unavailable" | "rate_limited" }
  | { ok: false; reason: "missing_lessons"; missing: string[] }
  | { ok: false; reason: "too_many_failed_attempts"; retryAfter: string };

export async function startOrResumeExam(track: string): Promise<StartExamResult> {
  if (!db) return { ok: false, reason: "unavailable" };
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, reason: "unauthenticated" };
  if (!rateLimit(`exam-start:${userId}`, 10, 60 * 1000)) {
    return { ok: false, reason: "rate_limited" };
  }

  const pool = getExamQuestionPool(track);
  if (pool.length === 0) return { ok: false, reason: "unavailable" };

  // Finalize any stale in-progress attempt first so it correctly counts
  // toward the rolling failure window and doesn't block a fresh start.
  const inProgressRows = await db
    .select()
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.userId, userId),
        eq(examAttempts.track, track),
        eq(examAttempts.status, "in_progress")
      )
    )
    .limit(1);

  if (inProgressRows[0]) {
    const current = await finalizeIfExpired(inProgressRows[0]);
    if (current.status === "in_progress") {
      // Still within the window — resume it as-is, no eligibility/limit
      // re-check needed (already passed both when it was created).
      const questionIds = JSON.parse(current.questionIds) as string[];
      const optionOrder = JSON.parse(current.optionOrder) as Record<string, number[]>;
      return {
        ok: true,
        attemptId: current.id,
        questions: reconstructSanitized(pool, questionIds, optionOrder),
        expiresAt: current.expiresAt.toISOString(),
        answers: JSON.parse(current.answers),
      };
    }
  }

  const eligibility = await getExamEligibility(track);
  if (!eligibility.eligible) {
    if (eligibility.reason === "missing_lessons") {
      return { ok: false, reason: "missing_lessons", missing: eligibility.missing };
    }
    return { ok: false, reason: eligibility.reason === "unauthenticated" ? "unauthenticated" : "unavailable" };
  }

  const since = new Date(Date.now() - FAILED_ATTEMPT_WINDOW_MS);
  const recentFailed = await db
    .select({ submittedAt: examAttempts.submittedAt })
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.userId, userId),
        eq(examAttempts.track, track),
        eq(examAttempts.status, "graded"),
        eq(examAttempts.passed, false),
        gte(examAttempts.submittedAt, since)
      )
    );
  if (recentFailed.length >= MAX_FAILED_ATTEMPTS_PER_WINDOW) {
    const oldest = recentFailed
      .map((r) => r.submittedAt!.getTime())
      .sort((a, b) => a - b)[0];
    const retryAfter = new Date(oldest + FAILED_ATTEMPT_WINDOW_MS).toISOString();
    return { ok: false, reason: "too_many_failed_attempts", retryAfter };
  }

  const { questionIds, optionOrder, sanitized } = pickAndSanitize(pool, EXAM_QUESTIONS);
  const expiresAt = new Date(Date.now() + EXAM_DURATION_MS);

  try {
    const [inserted] = await db
      .insert(examAttempts)
      .values({
        userId,
        track,
        questionIds: JSON.stringify(questionIds),
        optionOrder: JSON.stringify(optionOrder),
        total: sanitized.length,
        expiresAt,
      })
      .returning({ id: examAttempts.id });

    return {
      ok: true,
      attemptId: inserted.id,
      questions: sanitized,
      expiresAt: expiresAt.toISOString(),
      answers: {},
    };
  } catch (error: unknown) {
    if (!isActiveExamAttemptConflict(error)) throw error;

    // A concurrent start request won. Resume its row instead of creating a
    // second attempt that could evade the rolling failed-attempt limit.
    const concurrent = await db
      .select()
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.userId, userId),
          eq(examAttempts.track, track),
          eq(examAttempts.status, "in_progress")
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
      expiresAt: winner.expiresAt.toISOString(),
      answers: JSON.parse(winner.answers),
    };
  }
}

// ── Autosave ──────────────────────────────────────────────────────────────

export type SaveAnswerResult = { ok: true } | { ok: false; reason: "not_found" | "expired" | "rate_limited" };

export async function saveExamAnswer(
  attemptId: string,
  questionId: string,
  selectedIndex: number
): Promise<SaveAnswerResult> {
  if (!db) return { ok: false, reason: "not_found" };
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, reason: "not_found" };
  if (!rateLimit(`exam-autosave:${userId}`, 120, 60 * 1000)) {
    return { ok: false, reason: "rate_limited" };
  }
  if (!Number.isInteger(selectedIndex) || selectedIndex < 0) {
    return { ok: false, reason: "not_found" };
  }

  const rows = await db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.id, attemptId))
    .limit(1);
  const attempt = rows[0];
  if (!attempt || attempt.userId !== userId) return { ok: false, reason: "not_found" };
  if (attempt.status !== "in_progress") return { ok: false, reason: "expired" };
  if (Date.now() > attempt.expiresAt.getTime()) {
    await finalizeIfExpired(attempt);
    return { ok: false, reason: "expired" };
  }

  const questionIds = JSON.parse(attempt.questionIds) as string[];
  if (!questionIds.includes(questionId)) return { ok: false, reason: "not_found" };

  const answers = JSON.parse(attempt.answers) as Record<string, number>;
  answers[questionId] = selectedIndex;
  await db
    .update(examAttempts)
    .set({ answers: JSON.stringify(answers) })
    .where(eq(examAttempts.id, attemptId));

  return { ok: true };
}

// ── Submit / finalize ──────────────────────────────────────────────────────

export type SubmitExamResult =
  | { ok: true; score: number; total: number; passed: boolean; results: GradedQuestion[] }
  | { ok: false; reason: "not_found" | "rate_limited" };

/** Always safe to call — grades whatever was autosaved, whether on time or after expiry. Idempotent once graded. */
export async function submitExam(attemptId: string): Promise<SubmitExamResult> {
  if (!db) return { ok: false, reason: "not_found" };
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, reason: "not_found" };
  if (!rateLimit(`exam-submit:${userId}`, 10, 60 * 1000)) {
    return { ok: false, reason: "rate_limited" };
  }

  const rows = await db
    .select()
    .from(examAttempts)
    .where(eq(examAttempts.id, attemptId))
    .limit(1);
  const attempt = rows[0];
  if (!attempt || attempt.userId !== userId) return { ok: false, reason: "not_found" };

  const pool = getExamQuestionPool(attempt.track);
  const questionIds = JSON.parse(attempt.questionIds) as string[];
  const optionOrder = JSON.parse(attempt.optionOrder) as Record<string, number[]>;

  if (attempt.status === "in_progress") {
    const answers = JSON.parse(attempt.answers) as Record<string, number>;
    const { score, total, results } = grade(pool, questionIds, optionOrder, answers);
    const passed = score >= EXAM_PASS;
    await db
      .update(examAttempts)
      .set({ status: "graded", score, total, passed, submittedAt: new Date() })
      .where(eq(examAttempts.id, attemptId));
    return { ok: true, score, total, passed, results };
  }

  // Already graded — idempotent re-read (e.g. client retried after a
  // network blip), no re-grading.
  const answers = JSON.parse(attempt.answers) as Record<string, number>;
  const { score, total, results } = grade(pool, questionIds, optionOrder, answers);
  return { ok: true, score, total, passed: !!attempt.passed, results };
}

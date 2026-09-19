"use server";

import { eq, and, gte, gt, isNull, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { examAttempts, lessonQuizAttempts } from "@/db/schema";
import {
  getExamQuestionPool,
  pickAndSanitize,
  reconstructSanitized,
  grade,
  type SanitizedQuestion,
} from "@/lib/quiz-bank";
import { getExamPrerequisitePolicy } from "@/lib/quiz-requirements";
import { applyAnswerKeyPolicy, type ExamQuestionOutcome } from "@/lib/exam-policy";
import { rateLimit } from "@/lib/rate-limit";
import { isUniqueViolation } from "@/lib/db-errors";
import type { Role } from "@/lib/rbac";

const EXAM_QUESTIONS = 40;
const EXAM_PASS = 32; // out of 40
const EXAM_DURATION_MS = 50 * 60 * 1000; // 50 minutes, server-enforced
const MAX_FAILED_ATTEMPTS_PER_WINDOW = 3;
const FAILED_ATTEMPT_WINDOW_MS = 24 * 60 * 60 * 1000; // rolling 24h
const ACTIVE_EXAM_ATTEMPT_INDEX =
  "exam_attempt_one_in_progress_per_track";

function isActiveExamAttemptConflict(error: unknown): boolean {
  return isUniqueViolation(error, ACTIVE_EXAM_ATTEMPT_INDEX);
}

// The owner must be able to open any track's final exam to review its
// questions without first clearing all of that track's lesson quizzes, and
// without burning the learner-facing 3-failures-per-24h cooldown while doing
// it. This waives ONLY the two prerequisite gates — question selection,
// server grading, the 50-minute deadline and the 32/40 pass mark are
// untouched, so a certificate still requires a genuinely passed attempt.
function bypassesExamPrerequisites(role: Role | undefined): boolean {
  return role === "owner";
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

  const policy = getExamPrerequisitePolicy(track);
  if (!policy) return { eligible: false, reason: "unavailable" };
  if (bypassesExamPrerequisites(session?.user?.role)) return { eligible: true };

  if (policy.mode === "final_exam_only") {
    // No lesson-quiz attempts are required to start the final exam. The
    // final exam itself is the only eligibility gate — passed, server-graded,
    // randomized, time-limited, answer-key protected.
    return { eligible: true };
  }

  // policy.mode === "lesson_quizzes"
  if (policy.requiredLessons.length === 0) {
    // Defensive: an explicitly configured lesson_quizzes mode with zero
    // required lessons is a misconfiguration — refuse rather than silently
    // accept anyone.
    return { eligible: false, reason: "unavailable" };
  }

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
  const missing = policy.requiredLessons.filter((slug) => !passedSet.has(slug));
  if (missing.length > 0) return { eligible: false, reason: "missing_lessons", missing };
  return { eligible: true };
}

// ── Attempt state machine ────────────────────────────────────────────────
//
//   in_progress (answers mutable)
//     ── submitExam claims it: sets submittedAt ──▶ in_progress + submittedAt
//        (answers FROZEN: autosave requires submittedAt IS NULL)
//     ── or the deadline passes ──▶ answers FROZEN (autosave requires
//        expiresAt > now)
//   frozen ── grade ──▶ graded (immutable; the UPDATE requires
//                               status = 'in_progress', so only one grading
//                               outcome can ever be stored)
//
// Grading reads only frozen answers and is deterministic, so concurrent
// graders compute the same result and at most one of them writes it.

type AttemptRow = typeof examAttempts.$inferSelect;

function isFrozen(attempt: AttemptRow): boolean {
  return attempt.submittedAt !== null || Date.now() > attempt.expiresAt.getTime();
}

/** Grades a frozen in-progress attempt exactly once; returns the stored row. */
async function gradeFrozenAttempt(attempt: AttemptRow): Promise<AttemptRow> {
  if (!db) return attempt;
  const pool = getExamQuestionPool(attempt.track);
  const questionIds = JSON.parse(attempt.questionIds) as string[];
  const optionOrder = JSON.parse(attempt.optionOrder) as Record<string, number[]>;
  const answers = JSON.parse(attempt.answers) as Record<string, number>;
  const { score, total } = grade(pool, questionIds, optionOrder, answers);
  const passed = score >= EXAM_PASS;

  const [graded] = await db
    .update(examAttempts)
    .set({
      status: "graded",
      score,
      total,
      passed,
      submittedAt: attempt.submittedAt ?? attempt.expiresAt,
    })
    .where(and(eq(examAttempts.id, attempt.id), eq(examAttempts.status, "in_progress")))
    .returning();
  if (graded) return graded;

  // Another request graded it first — return what is stored (identical,
  // since the answers were frozen).
  const [stored] = await db.select().from(examAttempts).where(eq(examAttempts.id, attempt.id)).limit(1);
  return stored ?? attempt;
}

/** Finalizes an in-progress attempt that is expired or already submitted. */
async function finalizeIfFrozen(attempt: AttemptRow): Promise<AttemptRow> {
  if (attempt.status !== "in_progress" || !isFrozen(attempt)) return attempt;
  return gradeFrozenAttempt(attempt);
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
    const current = await finalizeIfFrozen(inProgressRows[0]);
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

  if (!bypassesExamPrerequisites(session?.user?.role)) {
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

  if (typeof attemptId !== "string" || typeof questionId !== "string") {
    return { ok: false, reason: "not_found" };
  }

  // ONE atomic statement: merges this answer into the stored JSON only while
  // the attempt is the caller's, in progress, not submitted, not expired, and
  // the question belongs to it. Concurrent autosaves can't overwrite each
  // other (no read-modify-write), and nothing can change after submit/expiry.
  const [saved] = await db
    .update(examAttempts)
    .set({
      answers: sql`(${examAttempts.answers}::jsonb || jsonb_build_object(${questionId}::text, ${selectedIndex}::int))::text`,
    })
    .where(
      and(
        eq(examAttempts.id, attemptId),
        eq(examAttempts.userId, userId),
        eq(examAttempts.status, "in_progress"),
        isNull(examAttempts.submittedAt),
        gt(examAttempts.expiresAt, new Date()),
        sql`${examAttempts.questionIds}::jsonb @> jsonb_build_array(${questionId}::text)`
      )
    )
    .returning({ id: examAttempts.id });
  if (saved) return { ok: true };

  // Refused — report why (and finalize an attempt whose time is up).
  const [attempt] = await db.select().from(examAttempts).where(eq(examAttempts.id, attemptId)).limit(1);
  if (!attempt || attempt.userId !== userId) return { ok: false, reason: "not_found" };
  if (attempt.status !== "in_progress" || isFrozen(attempt)) {
    await finalizeIfFrozen(attempt);
    return { ok: false, reason: "expired" };
  }
  return { ok: false, reason: "not_found" }; // question not part of this attempt
}

// ── Submit / finalize ──────────────────────────────────────────────────────

export type SubmitExamResult =
  | { ok: true; score: number; total: number; passed: boolean; results: ExamQuestionOutcome[] }
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

  if (typeof attemptId !== "string") return { ok: false, reason: "not_found" };

  // Claim: freeze the answers by setting submittedAt, atomically, only if
  // nobody has yet. From here autosave is refused and grading is final.
  await db
    .update(examAttempts)
    .set({ submittedAt: new Date() })
    .where(
      and(
        eq(examAttempts.id, attemptId),
        eq(examAttempts.userId, userId),
        eq(examAttempts.status, "in_progress"),
        isNull(examAttempts.submittedAt)
      )
    );

  const [row] = await db.select().from(examAttempts).where(eq(examAttempts.id, attemptId)).limit(1);
  if (!row || row.userId !== userId) return { ok: false, reason: "not_found" };

  // Grade exactly once (a concurrent submit converges on the stored result).
  const attempt = row.status === "in_progress" ? await gradeFrozenAttempt(row) : row;

  const pool = getExamQuestionPool(attempt.track);
  const questionIds = JSON.parse(attempt.questionIds) as string[];
  const optionOrder = JSON.parse(attempt.optionOrder) as Record<string, number[]>;
  const answers = JSON.parse(attempt.answers) as Record<string, number>;
  // Per-question outcomes are recomputed from the frozen answers; the score
  // and pass/fail returned are the STORED ones.
  const { results } = grade(pool, questionIds, optionOrder, answers);
  const passed = !!attempt.passed;
  return {
    ok: true,
    score: attempt.score ?? 0,
    total: attempt.total,
    passed,
    results: applyAnswerKeyPolicy(results, passed),
  };
}

import { and, eq, inArray, sql } from "drizzle-orm";
import type { db as appDb } from "@/db";
import { examAttempts, lessonCompletions } from "@/db/schema";

// THE server-side source of truth for learning stats used anywhere trust
// matters: the public leaderboard, account points/level, achievements.
//
//   lessons  = lesson_completion rows (server-validated, one per lesson)
//   quizzes  = tracks with a PASSED, server-graded final exam attempt
//              (exam_attempt: questions picked + graded on the server)
//
// Browser-reported quiz results (localStorage `quizzes`, legacy practice
// quizzes graded in the browser) are NEVER counted here. A client can't raise
// any number below by sending a score — there is no score input at all.

type Db = NonNullable<typeof appDb>;

export type TrustedCounts = {
  lessonsDone: number;
  tracksStarted: number;
  quizzesPassed: number;
};

export type TrustedQuizResult = { score: number; total: number; passedAt: string };

const EMPTY: TrustedCounts = { lessonsDone: 0, tracksStarted: 0, quizzesPassed: 0 };

/** Trusted counts per user (all users with any activity, or just `userIds`). */
export async function trustedCountsByUser(
  db: Db,
  userIds?: string[]
): Promise<Map<string, TrustedCounts>> {
  if (userIds && userIds.length === 0) return new Map();

  const lessons = await db
    .select({
      userId: lessonCompletions.userId,
      lessonsDone: sql<number>`count(*)::int`,
      tracksStarted: sql<number>`count(distinct ${lessonCompletions.track})::int`,
    })
    .from(lessonCompletions)
    .where(userIds ? inArray(lessonCompletions.userId, userIds) : undefined)
    .groupBy(lessonCompletions.userId);

  const passes = await db
    .select({
      userId: examAttempts.userId,
      quizzesPassed: sql<number>`count(distinct ${examAttempts.track})::int`,
    })
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.status, "graded"),
        eq(examAttempts.passed, true),
        userIds ? inArray(examAttempts.userId, userIds) : undefined
      )
    )
    .groupBy(examAttempts.userId);

  const out = new Map<string, TrustedCounts>();
  for (const r of lessons) {
    out.set(r.userId, { ...EMPTY, lessonsDone: r.lessonsDone, tracksStarted: r.tracksStarted });
  }
  for (const r of passes) {
    out.set(r.userId, { ...(out.get(r.userId) ?? EMPTY), quizzesPassed: r.quizzesPassed });
  }
  return out;
}

export async function trustedCountsFor(db: Db, userId: string): Promise<TrustedCounts> {
  return (await trustedCountsByUser(db, [userId])).get(userId) ?? EMPTY;
}

/** Best passed server-graded exam result per track, for the account UI. */
export async function trustedQuizResults(
  db: Db,
  userId: string
): Promise<Record<string, TrustedQuizResult>> {
  const rows = await db
    .select({
      track: examAttempts.track,
      score: examAttempts.score,
      total: examAttempts.total,
      submittedAt: examAttempts.submittedAt,
    })
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.userId, userId),
        eq(examAttempts.status, "graded"),
        eq(examAttempts.passed, true)
      )
    );
  const best: Record<string, TrustedQuizResult> = {};
  for (const r of rows) {
    const score = r.score ?? 0;
    if (!best[r.track] || score > best[r.track].score) {
      best[r.track] = {
        score,
        total: r.total,
        passedAt: (r.submittedAt ?? new Date(0)).toISOString(),
      };
    }
  }
  return best;
}

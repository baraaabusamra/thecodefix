"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { userProgress } from "@/db/schema";
import { type Progress } from "@/lib/progress-types";
import { getTracks, getLessons } from "@/lib/content";
import { getQuiz } from "@/lib/quiz";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeProgressInput } from "@/lib/progress-sanitize";

// Server-backed progress for signed-in users. Both functions no-op safely when
// there's no database or no session, so the client store can call them blindly
// (anonymous visitors keep using localStorage only).

export async function getMyProgress(): Promise<Progress | null> {
  if (!db) return null;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const rows = await db
    .select()
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .limit(1);
  if (!rows[0]) return null;

  let data: Partial<Progress> = {};
  try {
    data = JSON.parse(rows[0].data || "{}");
  } catch {
    data = {};
  }
  return {
    name: rows[0].name,
    completedLessons: data.completedLessons ?? {},
    quizzes: data.quizzes ?? {},
  };
}

// Server Actions are public endpoints — a caller can submit this shape
// directly (bypassing the UI entirely), and this data drives the public
// leaderboard and achievement badges. Every track/lesson/quiz-score claim
// is checked against real content before being persisted, the same way
// certificate/actions.ts validates quiz results. Unknown tracks/lessons and
// impossible scores are silently dropped rather than rejecting the whole
// save, so a stale client (content changed since their last visit) doesn't
// lose their otherwise-valid progress.
// The rules themselves live in src/lib/progress-sanitize.ts (pure, tested).
async function sanitizeProgress(p: Progress): Promise<Progress> {
  const tracks = await getTracks();
  return sanitizeProgressInput(p, {
    trackSlugs: new Set(tracks.map((t) => t.slug)),
    lessonsFor: async (track) => new Set((await getLessons(track)).map((l) => l.slug)),
    quizLength: (track) => getQuiz(track)?.questions.length ?? null,
  });
}

export async function saveMyProgress(p: Progress): Promise<void> {
  if (!db) return;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  // This fires on normal progress mutations, so keep a generous one-minute
  // backstop that blocks scripts without throttling real lesson navigation.
  if (!rateLimit(`save-progress:${userId}`, 60, 60 * 1000)) return;

  const safe = await sanitizeProgress(p);
  const data = JSON.stringify({
    completedLessons: safe.completedLessons,
    quizzes: safe.quizzes,
  });

  await db
    .insert(userProgress)
    .values({ userId, name: safe.name, data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userProgress.userId,
      set: { name: safe.name, data, updatedAt: new Date() },
    });
}

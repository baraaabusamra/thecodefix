"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { userProgress } from "@/db/schema";
import { type Progress } from "@/lib/progress-types";
import { getTracks, getLessons } from "@/lib/content";
import { getQuiz } from "@/lib/quiz";
import { rateLimit } from "@/lib/rate-limit";

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
async function sanitizeProgress(p: Progress): Promise<Progress> {
  const tracks = await getTracks();
  const trackSlugs = new Set(tracks.map((t) => t.slug));

  const completedLessons: Record<string, string[]> = {};
  for (const [track, lessons] of Object.entries(p?.completedLessons ?? {})) {
    if (!trackSlugs.has(track) || !Array.isArray(lessons)) continue;
    const realLessons = new Set((await getLessons(track)).map((l) => l.slug));
    const filtered = lessons.filter(
      (slug): slug is string => typeof slug === "string" && realLessons.has(slug)
    );
    if (filtered.length) completedLessons[track] = filtered;
  }

  const quizzes: Progress["quizzes"] = {};
  for (const [track, result] of Object.entries(p?.quizzes ?? {})) {
    if (!trackSlugs.has(track) || !result) continue;
    const quiz = getQuiz(track);
    if (!quiz) continue;
    const score = Number(result.score);
    const total = Number(result.total);
    if (!Number.isFinite(score) || !Number.isFinite(total)) continue;
    if (total !== quiz.questions.length) continue;
    if (score < 0 || score > total) continue;
    const passedAt =
      typeof result.passedAt === "string" ? result.passedAt : new Date().toISOString();
    quizzes[track] = { score, total, passedAt };
  }

  return {
    name: typeof p?.name === "string" ? p.name.slice(0, 100) : "",
    completedLessons,
    quizzes,
  };
}

export async function saveMyProgress(p: Progress): Promise<void> {
  if (!db) return;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  // Called on every local progress mutation (lesson toggle, quiz pass), so
  // the window is generous — this is a backstop against a scripted flood,
  // not a throttle on normal clicking-through-lessons usage.
  if (!rateLimit(`save-progress:${userId}`, 60, 5 * 60 * 1000)) return;

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

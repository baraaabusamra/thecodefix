"use server";

import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { lessonCompletions, userProgress } from "@/db/schema";
import { type Progress } from "@/lib/progress-types";
import { getTracks, getLessons } from "@/lib/content";
import { getQuiz } from "@/lib/quiz";
import { rateLimit } from "@/lib/rate-limit";
import { sanitizeProgressInput } from "@/lib/progress-sanitize";
import {
  trustedCountsFor,
  trustedQuizResults,
  type TrustedCounts,
} from "@/lib/trusted-stats";

// Server-owned learning progress for signed-in users.
//
// TRUSTED (server-owned): lesson_completion rows. They are only written here,
// one idempotent row per (user, track, lesson), after the track and lesson
// were validated against real content. The browser can only REQUEST
// "complete"/"uncomplete" for itself, or ask to import guest progress — it
// never submits a state the server stores as-is.
//
// UNTRUSTED (browser-only): localStorage progress and its quiz results. They
// drive the guest UI but are never persisted as trusted records.
//
// Every function no-ops safely without a database or a session, so the
// client store can call them blindly (anonymous visitors use localStorage).

async function signedInUserId(): Promise<string | null> {
  if (!db) return null;
  const session = await auth();
  return session?.user?.id ?? null;
}

async function progressContent() {
  const tracks = await getTracks();
  return {
    trackSlugs: new Set(tracks.map((t) => t.slug)),
    lessonsFor: async (track: string) => new Set((await getLessons(track)).map((l) => l.slug)),
    quizLength: (track: string) => getQuiz(track)?.questions.length ?? null,
  };
}

// Validated, additive import of lesson claims (guest progress / legacy JSON).
// Never deletes: server progress is only ever extended by an import.
async function importCompletions(userId: string, input: unknown): Promise<number> {
  const safe = await sanitizeProgressInput(input, await progressContent());
  const rows = Object.entries(safe.completedLessons).flatMap(([track, slugs]) =>
    slugs.map((lessonSlug) => ({ userId, track, lessonSlug }))
  );
  if (rows.length === 0) return 0;
  await db!.insert(lessonCompletions).values(rows).onConflictDoNothing();
  return rows.length;
}

// One-time import of completions stored in the legacy user_progress JSON (from
// before lesson_completion existed), so no signed-in learner loses progress
// they only have on the server. Guarded by completionsImportedAt.
async function importLegacyCompletions(userId: string) {
  const [row] = await db!
    .select({ data: userProgress.data, importedAt: userProgress.completionsImportedAt })
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .limit(1);
  if (!row || row.importedAt) return;
  let legacy: unknown = {};
  try {
    legacy = JSON.parse(row.data || "{}");
  } catch {
    legacy = {};
  }
  await importCompletions(userId, legacy);
  await db!
    .update(userProgress)
    .set({ completionsImportedAt: new Date() })
    .where(and(eq(userProgress.userId, userId), isNull(userProgress.completionsImportedAt)));
}

export type CompletionResult =
  | { ok: true }
  | { ok: false; reason: "unauthenticated" | "invalid" | "rate_limited" };

/** Marks one lesson complete for the signed-in user. Idempotent. */
export async function completeLesson(track: string, lesson: string): Promise<CompletionResult> {
  const userId = await signedInUserId();
  if (!userId) return { ok: false, reason: "unauthenticated" };
  if (!rateLimit(`lesson-complete:${userId}`, 120, 60 * 1000)) {
    return { ok: false, reason: "rate_limited" };
  }
  if (typeof track !== "string" || typeof lesson !== "string") return { ok: false, reason: "invalid" };

  const content = await progressContent();
  if (!content.trackSlugs.has(track) || !(await content.lessonsFor(track)).has(lesson)) {
    return { ok: false, reason: "invalid" };
  }
  await db!
    .insert(lessonCompletions)
    .values({ userId, track, lessonSlug: lesson })
    .onConflictDoNothing();
  return { ok: true };
}

/** Un-marks one of the signed-in user's own lessons (the UI toggle). */
export async function uncompleteLesson(track: string, lesson: string): Promise<CompletionResult> {
  const userId = await signedInUserId();
  if (!userId) return { ok: false, reason: "unauthenticated" };
  if (!rateLimit(`lesson-complete:${userId}`, 120, 60 * 1000)) {
    return { ok: false, reason: "rate_limited" };
  }
  if (typeof track !== "string" || typeof lesson !== "string") return { ok: false, reason: "invalid" };
  // Scoped to the caller's own rows: another user's progress is unreachable.
  await db!
    .delete(lessonCompletions)
    .where(
      and(
        eq(lessonCompletions.userId, userId),
        eq(lessonCompletions.track, track),
        eq(lessonCompletions.lessonSlug, lesson)
      )
    );
  return { ok: true };
}

/** Server-owned progress for the signed-in user (null when anonymous). */
export async function getMyProgress(): Promise<Progress | null> {
  const userId = await signedInUserId();
  if (!userId) return null;

  await importLegacyCompletions(userId);

  const [profile] = await db!
    .select({ name: userProgress.name })
    .from(userProgress)
    .where(eq(userProgress.userId, userId))
    .limit(1);
  const rows = await db!
    .select({ track: lessonCompletions.track, lessonSlug: lessonCompletions.lessonSlug })
    .from(lessonCompletions)
    .where(eq(lessonCompletions.userId, userId));

  const completedLessons: Record<string, string[]> = {};
  for (const r of rows) (completedLessons[r.track] ??= []).push(r.lessonSlug);

  return {
    name: profile?.name ?? "",
    completedLessons,
    // Only server-graded results; browser-reported scores are never server state.
    quizzes: await trustedQuizResults(db!, userId),
  };
}

/**
 * Trusted stats for the signed-in user (points, level, achievements on the
 * account page). Same source as the public leaderboard.
 */
export async function getMyStats(): Promise<TrustedCounts | null> {
  const userId = await signedInUserId();
  if (!userId) return null;
  await importLegacyCompletions(userId);
  return trustedCountsFor(db!, userId);
}

/**
 * Imports this browser's (guest) progress into the account on sign-in.
 * Additive and validated: unknown tracks/lessons are dropped, duplicates
 * collapse, nothing on the server is deleted, and browser quiz scores are
 * ignored (untrusted). Also stores the certificate display name.
 */
export async function saveMyProgress(p: Progress): Promise<void> {
  const userId = await signedInUserId();
  if (!userId) return;
  if (!rateLimit(`save-progress:${userId}`, 60, 60 * 1000)) return;

  await importCompletions(userId, p);

  const name = typeof p?.name === "string" ? p.name.slice(0, 100) : "";
  if (name) await upsertName(userId, name);
}

/** Saves the certificate display name only. */
export async function saveMyName(name: string): Promise<void> {
  const userId = await signedInUserId();
  if (!userId) return;
  if (!rateLimit(`save-progress:${userId}`, 60, 60 * 1000)) return;
  await upsertName(userId, typeof name === "string" ? name.slice(0, 100) : "");
}

async function upsertName(userId: string, name: string) {
  await db!
    .insert(userProgress)
    .values({ userId, name, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userProgress.userId,
      set: { name, updatedAt: new Date() },
    });
}

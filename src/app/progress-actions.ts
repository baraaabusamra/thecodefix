"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { userProgress } from "@/db/schema";
import { type Progress } from "@/lib/progress-types";

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

export async function saveMyProgress(p: Progress): Promise<void> {
  if (!db) return;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  const safe: Progress = {
    name: typeof p?.name === "string" ? p.name : "",
    completedLessons: p?.completedLessons ?? {},
    quizzes: p?.quizzes ?? {},
  };
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

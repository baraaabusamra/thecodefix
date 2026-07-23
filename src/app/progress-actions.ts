"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { userProgress } from "@/db/schema";
import { type Progress } from "@/lib/progress-types";
import { sanitizeText } from "@/lib/sanitize";
import { checkRateLimit, rateLimitKey, Limits } from "@/lib/rate-limit";
import { mergeProgress } from "@/lib/progress-sync";
import { logActivity } from "@/lib/activity";

const quizResultSchema = z.object({
  score: z.number().int().min(0),
  total: z.number().int().min(0),
  passedAt: z.string().default(() => new Date().toISOString()),
});

const progressSchema = z.object({
  name: z.string().max(200).default("").transform(sanitizeText),
  completedLessons: z.record(z.string(), z.array(z.string())).default({}),
  quizzes: z.record(z.string(), quizResultSchema).default({}),
  version: z.number().default(0),
});

async function readStoredProgress(userId: string): Promise<Progress | null> {
  if (!db) return null;
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
    version: rows[0].updatedAt?.getTime?.() ?? 0,
  };
}

export async function getMyProgress(): Promise<Progress | null> {
  if (!db) return null;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return readStoredProgress(userId);
}

export async function saveMyProgress(p: Progress): Promise<void> {
  if (!db) return;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  const rl = checkRateLimit(rateLimitKey("progress", userId), Limits.progress);
  if (!rl.allowed) return;

  const parsed = progressSchema.safeParse(p);
  if (!parsed.success) return;

  const server = await readStoredProgress(userId);
  const merged = server ? mergeProgress(parsed.data, server) : { ...parsed.data, version: Date.now() };
  const { name, completedLessons, quizzes } = merged;
  const data = JSON.stringify({ completedLessons, quizzes });

  await db
    .insert(userProgress)
    .values({ userId, name, data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: userProgress.userId,
      set: { name, data, updatedAt: new Date() },
    });

  await logActivity(5);
}

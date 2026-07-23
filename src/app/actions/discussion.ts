"use server";

import { z } from "zod";
import { eq, and, asc, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { requireDb } from "@/db";
import { comments } from "@/db/schema";
import { sanitizeText } from "@/lib/sanitize";
import { checkRateLimit, rateLimitKey, getClientIp, Limits } from "@/lib/rate-limit";

export type CommentVO = {
  id: string;
  track: string;
  lesson: string;
  parentId: string | null;
  userId: string | null;
  authorName: string;
  body: string;
  upvotes: number;
  createdAt: Date;
};

const postSchema = z.object({
  track: z.string().min(1).max(100),
  lesson: z.string().min(1).max(100),
  parentId: z.string().optional(),
  body: z.string().min(1).max(5000).transform((v) => sanitizeText(v)),
});

export async function postComment(formData: FormData): Promise<{ error?: string; ok?: boolean }> {
  if (!requireDb()) return { error: "قاعدة البيانات غير متصلة" };

  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("suggestions", ip), Limits.suggestion);
  if (!rl.allowed) return { error: "طلبات كثيرة — حاول بعد دقيقة" };

  const session = await auth();
  const parsed = postSchema.safeParse({
    track: formData.get("track"),
    lesson: formData.get("lesson"),
    parentId: formData.get("parentId") || undefined,
    body: formData.get("body"),
  });
  if (!parsed.success) return { error: "النص مطلوب" };

  const { track, lesson, parentId, body } = parsed.data;

  const db = requireDb();
  await db.insert(comments).values({
    track,
    lesson,
    parentId: parentId ?? null,
    userId: session?.user?.id ?? null,
    authorName: session?.user?.name ?? "مستخدم",
    body,
  });

  return { ok: true };
}

export async function getComments(track: string, lesson: string): Promise<CommentVO[]> {
  if (!requireDb()) return [];
  const db = requireDb();
  const rows = await db
    .select()
    .from(comments)
    .where(and(
      eq(comments.track, track),
      eq(comments.lesson, lesson),
      eq(comments.isApproved, true),
    ))
    .orderBy(asc(comments.createdAt));
  return rows;
}

export async function upvoteComment(id: string): Promise<void> {
  if (!requireDb()) return;
  const db = requireDb();
  await db.update(comments).set({ upvotes: sql`${comments.upvotes} + 1` }).where(eq(comments.id, id));
}

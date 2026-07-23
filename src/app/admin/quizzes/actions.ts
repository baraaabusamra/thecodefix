"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { writeRawQuiz, isValidQuizJson } from "@/lib/admin-quizzes";
import { isContentWritable } from "@/lib/admin-content";
import { requireDb } from "@/db";
import { quizQuestions } from "@/db/schema";
import { formSchema } from "@/lib/validation";

const saveQuizSchema = formSchema({
  track: z.string().min(1).max(100),
  content: z.string().max(500000),
});

export async function saveQuiz(formData: FormData) {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "content:edit")) {
    throw new Error("Forbidden");
  }
  if (!isContentWritable()) {
    throw new Error("Content is read-only in production.");
  }

  const parsed = saveQuizSchema.safeParse(formData);
  if (!parsed.success) throw new Error("Missing track.");
  const { track, content } = parsed.data;

  if (!isValidQuizJson(content)) {
    redirect(`/admin/quizzes/${track}?error=json`);
  }

  writeRawQuiz(track, content);

  revalidatePath(`/admin/quizzes/${track}`);
  revalidatePath(`/quiz/${track}`);
  redirect(`/admin/quizzes/${track}?saved=1`);
}

// ── DB-backed quiz question management ────────────────────────────────

const manageQuestionSchema = z.object({
  id: z.string().optional(),
  track: z.string().min(1),
  question: z.string().min(1).max(1000),
  options: z.array(z.string().min(1)).length(4),
  answer: z.coerce.number().int().min(0).max(3),
  explain: z.string().min(1).max(2000),
  difficulty: z.coerce.number().int().min(1).max(5).default(1),
  order: z.coerce.number().int().default(0),
});

export async function saveQuestion(formData: FormData) {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "content:edit")) throw new Error("Forbidden");
  const db = requireDb();

  const options = [0, 1, 2, 3].map((i) => (formData.get(`opt${i}`) as string) ?? "");

  const raw = {
    id: formData.get("id") as string | null,
    track: formData.get("track"),
    question: formData.get("question"),
    options,
    answer: formData.get("answer"),
    explain: formData.get("explain"),
    difficulty: formData.get("difficulty") ?? "1",
    order: formData.get("order") ?? "0",
  };

  const parsed = manageQuestionSchema.safeParse(raw);
  if (!parsed.success) throw new Error("Invalid input.");
  const { id, track, question, options: opts, answer, explain, difficulty, order } = parsed.data;

  if (id) {
    await db.update(quizQuestions).set({ question, options: JSON.stringify(opts), answer, explain, difficulty, order, updatedAt: new Date() }).where(eq(quizQuestions.id, id));
  } else {
    await db.insert(quizQuestions).values({ track, question, options: JSON.stringify(opts), answer, explain, difficulty, order });
  }

  revalidatePath(`/admin/quizzes/${track}`);
  redirect(`/admin/quizzes/${track}?saved=1`);
}

export async function deleteQuestion(formData: FormData) {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "content:edit")) throw new Error("Forbidden");
  const db = requireDb();

  const id = formData.get("id") as string;
  if (!id) throw new Error("Missing id.");

  await db.delete(quizQuestions).where(eq(quizQuestions.id, id));
  const track = formData.get("track") as string;
  revalidatePath(`/admin/quizzes/${track}`);
  redirect(`/admin/quizzes/${track}?saved=1`);
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { writeRawQuiz, isValidQuizJson } from "@/lib/admin-quizzes";
import { isContentWritable } from "@/lib/admin-content";

// Saves an edited quiz's raw JSON. Re-verifies access + capability because
// Server Actions are public endpoints.
export async function saveQuiz(formData: FormData) {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "content:edit")) {
    throw new Error("Forbidden");
  }
  if (!isContentWritable()) {
    throw new Error("Content is read-only in production.");
  }

  const track = String(formData.get("track") ?? "");
  const content = String(formData.get("content") ?? "");
  if (!track) throw new Error("Missing track.");

  if (!isValidQuizJson(content)) {
    redirect(`/admin/quizzes/${track}?error=json`);
  }

  writeRawQuiz(track, content);

  revalidatePath(`/admin/quizzes/${track}`);
  revalidatePath(`/quiz/${track}`);
  redirect(`/admin/quizzes/${track}?saved=1`);
}

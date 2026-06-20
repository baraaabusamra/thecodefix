"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { writeRawLesson, isContentWritable } from "@/lib/admin-content";

// Saves an edited lesson's raw MDX. Server Actions are public endpoints, so we
// re-verify access and capability here regardless of any UI-level gating.
export async function saveLesson(formData: FormData) {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "content:edit")) {
    throw new Error("Forbidden");
  }
  if (!isContentWritable()) {
    throw new Error("Content is read-only in production.");
  }

  const track = String(formData.get("track") ?? "");
  const slug = String(formData.get("slug") ?? "");
  const content = String(formData.get("content") ?? "");
  if (!track || !slug) throw new Error("Missing track or slug.");

  writeRawLesson(track, slug, content);

  // Refresh both the admin editor and the public lesson.
  revalidatePath(`/admin/content/${track}/${slug}`);
  revalidatePath(`/learn/${track}/${slug}`);
  redirect(`/admin/content/${track}/${slug}?saved=1`);
}

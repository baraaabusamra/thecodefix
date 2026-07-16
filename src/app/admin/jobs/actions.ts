"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { writeRawJob, isValidJobJson } from "@/lib/admin-jobs";
import { isContentWritable } from "@/lib/admin-content";

// Saves an edited job listing's raw JSON. Re-verifies access + capability
// because Server Actions are public endpoints.
export async function saveJob(formData: FormData) {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "jobs:moderate")) {
    throw new Error("Forbidden");
  }
  if (!isContentWritable()) {
    throw new Error("Content is read-only in production.");
  }

  const slug = String(formData.get("slug") ?? "");
  const content = String(formData.get("content") ?? "");
  if (!slug) throw new Error("Missing slug.");

  // Validate before writing; redirect with a flag rather than throwing a 500.
  if (!isValidJobJson(content)) {
    redirect(`/admin/jobs/${slug}?error=json`);
  }

  writeRawJob(slug, content);

  revalidatePath(`/admin/jobs/${slug}`);
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${slug}`);
  redirect(`/admin/jobs/${slug}?saved=1`);
}

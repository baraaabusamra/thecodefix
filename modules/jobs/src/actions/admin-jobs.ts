"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCapability } from "@tcf/identity/authorization";
import { writeRawJob, isValidJobJson } from "../admin/jobs";
import { isContentWritable } from "@tcf/content/admin/writer";

// Saves an edited job listing's raw JSON. Re-verifies access + capability
// because Server Actions are public endpoints.
export async function saveJob(formData: FormData) {
  await requireCapability("jobs:moderate");
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

"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { writeRawJob, isValidJobJson } from "@/lib/admin-jobs";
import { isContentWritable } from "@/lib/admin-content";
import { formSchema } from "@/lib/validation";

const saveJobSchema = formSchema({
  slug: z.string().min(1).max(200),
  content: z.string().max(500000),
});

export async function saveJob(formData: FormData) {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "jobs:moderate")) {
    throw new Error("Forbidden");
  }
  if (!isContentWritable()) {
    throw new Error("Content is read-only in production.");
  }

  const parsed = saveJobSchema.safeParse(formData);
  if (!parsed.success) throw new Error("Missing slug.");
  const { slug, content } = parsed.data;

  if (!isValidJobJson(content)) {
    redirect(`/admin/jobs/${slug}?error=json`);
  }

  writeRawJob(slug, content);

  revalidatePath(`/admin/jobs/${slug}`);
  revalidatePath("/jobs");
  revalidatePath(`/jobs/${slug}`);
  redirect(`/admin/jobs/${slug}?saved=1`);
}

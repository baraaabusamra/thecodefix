"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { requireDb } from "@/db";
import { contentLessons, auditLogs } from "@/db/schema";
import { assertOps } from "@/lib/admin-operations";
import { formSchema, safeTextOptional } from "@/lib/validation";
import { checkRateLimit, rateLimitKey, getClientIp, Limits } from "@/lib/rate-limit";

const workflowSchema = formSchema({
  id: z.string().min(1),
  status: z.enum(["draft", "review", "published", "suspended"]),
  reviewNotes: safeTextOptional,
});

export async function setLessonWorkflow(formData: FormData) {
  await assertOps();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-content-workflow", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = workflowSchema.safeParse(formData);
  if (!parsed.success) throw new Error("Invalid input.");
  const db = requireDb();
  const { id, status, reviewNotes } = parsed.data;

  const [row] = await db
    .update(contentLessons)
    .set({
      status,
      reviewNotes: reviewNotes || null,
      published: status === "published",
      updatedAt: new Date(),
    })
    .where(eq(contentLessons.id, id))
    .returning({ track: contentLessons.track, slug: contentLessons.slug });

  const session = await auth();
  await db.insert(auditLogs).values({
    userId: session?.user?.id ?? null,
    action: "lesson.status.update",
    target: id,
    meta: JSON.stringify({ status, hasNotes: !!reviewNotes }),
  });

  revalidatePath("/");
  revalidatePath("/learn");
  revalidatePath("/sitemap.xml");
  if (row) {
    revalidatePath(`/learn/${row.track}`);
    revalidatePath(`/learn/${row.track}/${row.slug}`);
  }
  revalidatePath("/admin/operations/content");
  revalidatePath("/admin/content");
  redirect("/admin/operations/content?saved=1");
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { requireDb } from "@/db";
import { contentLessons, auditLogs } from "@/db/schema";
import { assertOps } from "@/lib/admin-operations";

const STATUSES = new Set(["draft", "review", "published", "suspended"]);

// Moves a lesson through the editorial workflow (مسودة → قيد المراجعة →
// منشور → موقوف) and keeps the public `published` flag in sync, so the
// live-site readers keep working unchanged.
export async function setLessonWorkflow(formData: FormData) {
  // Publishing/suspending is an editorial decision: ops:manage AND
  // content:publish (operations, admin, owner).
  await assertOps("content:publish");
  const db = requireDb();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const reviewNotes = String(formData.get("reviewNotes") ?? "").trim() || null;
  if (!id || !STATUSES.has(status)) throw new Error("Invalid input.");

  const [row] = await db
    .update(contentLessons)
    .set({
      status: status as typeof contentLessons.$inferInsert.status,
      reviewNotes,
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

  // Publish/unpublish affects the live site (on-demand ISR), same paths as
  // the content CMS actions.
  revalidatePath("/");
  revalidatePath("/learn");
  revalidatePath("/sitemap.xml");
  if (row) {
    revalidatePath(`/learn/${row.track}`);
    revalidatePath(`/learn/${row.track}/${row.slug}`);
  }
  revalidatePath("/admin/operations/content");
  revalidatePath("/admin/content");
  // updateTag, not revalidateTag: this is a Server Action and publish/unpublish
  // should be reflected immediately (read-your-own-writes), not
  // stale-while-revalidate — see the comment on revalidateContent() in
  // src/app/admin/content/actions.ts for the full rationale.
  updateTag("content");
  redirect("/admin/operations/content?saved=1");
}

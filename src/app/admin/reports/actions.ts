"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { workReports, auditLogs } from "@/db/schema";
import { assertReports } from "@/lib/admin-reports";

const LIST = "/admin/reports";

const CATEGORIES = new Set([
  "social_media",
  "podcast",
  "event",
  "photography",
  "content_writing",
  "design",
  "other",
]);

export async function submitReport(formData: FormData) {
  const { userId } = await assertReports("reports:submit");
  const db = requireDb();
  // Token-mode owner has no user row to attribute the report to.
  if (!userId) redirect(`${LIST}?error=noaccount`);

  const category = String(formData.get("category") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  const links = String(formData.get("links") ?? "").trim() || null;
  const workDateRaw = String(formData.get("workDate") ?? "");
  const workDate = workDateRaw ? new Date(workDateRaw) : new Date();

  if (!CATEGORIES.has(category) || !title || !details || isNaN(+workDate)) {
    redirect(`${LIST}?error=invalid`);
  }

  const [row] = await db
    .insert(workReports)
    .values({
      userId: userId!,
      category: category as typeof workReports.$inferInsert.category,
      title,
      details,
      links,
      workDate,
    })
    .returning({ id: workReports.id });

  await db.insert(auditLogs).values({
    userId,
    action: "report.submit",
    target: row.id,
    meta: JSON.stringify({ category, title }),
  });

  revalidatePath(LIST);
  redirect(`${LIST}?saved=submitted`);
}

export async function reviewReport(formData: FormData) {
  const { access, userId } = await assertReports("reports:review");
  const db = requireDb();

  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reviewNote = String(formData.get("reviewNote") ?? "").trim() || null;
  if (!id || (decision !== "approved" && decision !== "rejected")) {
    throw new Error("Invalid input.");
  }

  const [report] = await db
    .select({ userId: workReports.userId, status: workReports.status })
    .from(workReports)
    .where(eq(workReports.id, id))
    .limit(1);
  if (!report) throw new Error("Report not found.");

  // No self-approval: the operations manager's own reports must be reviewed
  // one level up (admin/owner).
  if (
    userId &&
    report.userId === userId &&
    access.role !== "admin" &&
    access.role !== "owner"
  ) {
    redirect(`${LIST}?error=self`);
  }

  await db
    .update(workReports)
    .set({
      status: decision as typeof workReports.$inferInsert.status,
      reviewNote,
      reviewedBy: userId,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(workReports.id, id));

  await db.insert(auditLogs).values({
    userId,
    action: `report.${decision}`,
    target: id,
    meta: reviewNote ? JSON.stringify({ reviewNote }) : null,
  });

  revalidatePath(LIST);
  redirect(`${LIST}?saved=${decision}`);
}

/** Authors may withdraw their own PENDING report; reviewers may delete any. */
export async function deleteReport(formData: FormData) {
  const { access, userId } = await assertReports("reports:submit");
  const db = requireDb();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid input.");

  const [report] = await db
    .select({ userId: workReports.userId, status: workReports.status })
    .from(workReports)
    .where(eq(workReports.id, id))
    .limit(1);
  if (!report) redirect(`${LIST}?error=missing`);

  const isReviewer =
    access.role === "operations" ||
    access.role === "admin" ||
    access.role === "owner";
  const isOwnPending =
    !!userId && report.userId === userId && report.status === "pending";
  if (!isReviewer && !isOwnPending) throw new Error("Forbidden");

  await db.delete(workReports).where(eq(workReports.id, id));
  await db.insert(auditLogs).values({
    userId,
    action: "report.delete",
    target: id,
  });

  revalidatePath(LIST);
  redirect(`${LIST}?saved=deleted`);
}

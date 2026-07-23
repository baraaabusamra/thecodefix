"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireDb } from "@/db";
import { workReports, auditLogs } from "@/db/schema";
import { assertReports } from "@/lib/admin-reports";
import { formSchema, safeText, safeLongText, safeTextOptional } from "@/lib/validation";
import { checkRateLimit, rateLimitKey, getClientIp, Limits } from "@/lib/rate-limit";

const LIST = "/admin/reports";

const submitSchema = formSchema({
  category: z.enum(["social_media", "podcast", "event", "photography", "content_writing", "design", "other"]),
  title: safeText,
  details: safeLongText,
  links: safeTextOptional,
  workDate: z.string().optional().default(""),
});

export async function submitReport(formData: FormData) {
  const { userId } = await assertReports("reports:submit");
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-reports", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  if (!userId) redirect(`${LIST}?error=noaccount`);

  const parsed = submitSchema.safeParse(formData);
  if (!parsed.success) redirect(`${LIST}?error=invalid`);

  const db = requireDb();
  const { category, title, details, links, workDate } = parsed.data;
  const workDateVal = workDate ? new Date(workDate) : new Date();
  if (isNaN(+workDateVal)) redirect(`${LIST}?error=invalid`);

  const [row] = await db
    .insert(workReports)
    .values({ userId, category, title, details, links: links || null, workDate: workDateVal })
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

const reviewSchema = formSchema({
  id: z.string().min(1),
  decision: z.enum(["approved", "rejected"]),
  reviewNote: safeTextOptional,
});

export async function reviewReport(formData: FormData) {
  const { access, userId } = await assertReports("reports:review");
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-reports", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = reviewSchema.safeParse(formData);
  if (!parsed.success) throw new Error("Invalid input.");
  const db = requireDb();
  const { id, decision, reviewNote } = parsed.data;

  const [report] = await db
    .select({ userId: workReports.userId, status: workReports.status })
    .from(workReports)
    .where(eq(workReports.id, id))
    .limit(1);
  if (!report) throw new Error("Report not found.");

  if (userId && report.userId === userId && access.role !== "admin" && access.role !== "owner") {
    redirect(`${LIST}?error=self`);
  }

  await db
    .update(workReports)
    .set({
      status: decision,
      reviewNote: reviewNote || null,
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

export async function deleteReport(formData: FormData) {
  const { access, userId } = await assertReports("reports:submit");
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-reports", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = z.object({ id: z.string().min(1) }).safeParse({
    id: formData.get("id"),
  });
  if (!parsed.success) throw new Error("Invalid input.");
  const db = requireDb();
  const { id } = parsed.data;

  const [report] = await db
    .select({ userId: workReports.userId, status: workReports.status })
    .from(workReports)
    .where(eq(workReports.id, id))
    .limit(1);
  if (!report) redirect(`${LIST}?error=missing`);

  const isReviewer = access.role === "operations" || access.role === "admin" || access.role === "owner";
  const isOwnPending = !!userId && report.userId === userId && report.status === "pending";
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

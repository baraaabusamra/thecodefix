import { db } from "@tcf/db";
import { notifications, users } from "@tcf/db/schema";
import { eq, or } from "drizzle-orm";
import type { NewNotification } from "@tcf/db/schema";

async function getAdminUserIds(): Promise<string[]> {
  if (!db) return [];
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(or(eq(users.role, "admin"), eq(users.role, "operations")));
  return rows.map((r) => r.id);
}

async function insertNotification(data: NewNotification): Promise<void> {
  if (!db) return;
  await db.insert(notifications).values(data);
}

export async function notifyCreatorRegistered(
  creatorUserId: string,
  creatorDisplayName: string
): Promise<void> {
  const adminIds = await getAdminUserIds();
  const notificationsToInsert: NewNotification[] = adminIds.map((userId) => ({
    userId,
    type: "creator.registered",
    title: "مبدع جديد سجّل",
    body: `مبدع جديد سجّل: ${creatorDisplayName}`,
    link: "/admin/creators",
  }));
  notificationsToInsert.push({
    userId: creatorUserId,
    type: "creator.welcome",
    title: "مرحبًا بك في منصة المبدعين!",
    body: "تم تسجيلك بنجاح كمنشئ محتوى. يمكنك الآن إرسال فيديوهاتك للمراجعة.",
    link: "/creators/submit",
  });
  for (const n of notificationsToInsert) {
    await insertNotification(n);
  }
}

export async function notifySubmissionReceived(
  creatorUserId: string,
  submissionTitle: string,
  submissionId: string
): Promise<void> {
  const adminIds = await getAdminUserIds();
  const notificationsToInsert: NewNotification[] = adminIds.map((userId) => ({
    userId,
    type: "submission.received",
    title: "طلب مراجعة جديد",
    body: `طلب مراجعة جديد: ${submissionTitle}`,
    link: `/admin/creators/submissions/${submissionId}`,
  }));
  notificationsToInsert.push({
    userId: creatorUserId,
    type: "submission.received",
    title: "تم استلام الفيديو",
    body: `تم استلام الفيديو "${submissionTitle}"، قيد المراجعة`,
    link: `/creators/submissions`,
  });
  for (const n of notificationsToInsert) {
    await insertNotification(n);
  }
}

export async function notifySubmissionApproved(
  creatorUserId: string,
  submissionTitle: string
): Promise<void> {
  await insertNotification({
    userId: creatorUserId,
    type: "submission.approved",
    title: "تمت الموافقة على الفيديو",
    body: `تمت الموافقة على فيديو: ${submissionTitle}`,
    link: "/creators/submissions",
  });
}

export async function notifySubmissionRejected(
  creatorUserId: string,
  submissionTitle: string,
  reason?: string
): Promise<void> {
  await insertNotification({
    userId: creatorUserId,
    type: "submission.rejected",
    title: "لم تتم الموافقة على الفيديو",
    body: reason
      ? `لم تتم الموافقة على: ${submissionTitle} — ${reason}`
      : `لم تتم الموافقة على: ${submissionTitle}`,
    link: "/creators/submissions",
  });
}

export async function notifySubmissionNeedsRevision(
  creatorUserId: string,
  submissionTitle: string,
  notes?: string
): Promise<void> {
  await insertNotification({
    userId: creatorUserId,
    type: "submission.needs_revision",
    title: "الفيديو بحاجة لتعديل",
    body: notes
      ? `فيديو ${submissionTitle} بحاجة لتعديل — ${notes}`
      : `فيديو ${submissionTitle} بحاجة لتعديل`,
    link: "/creators/submissions",
  });
}

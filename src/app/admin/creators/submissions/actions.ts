"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { requireDb } from "@/db";
import { videoSubmissions, creators, auditLogs } from "@/db/schema";
import {
  notifySubmissionApproved,
  notifySubmissionRejected,
  notifySubmissionNeedsRevision,
} from "@/lib/creators-notifications";

const VALID_TRANSITIONS: Record<string, Set<string>> = {
  pending: new Set(["approved", "rejected", "needs_revision"]),
  needs_revision: new Set(["pending", "approved", "rejected"]),
};

async function assertCreatorsAccess() {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "creators:review")) {
    throw new Error("Forbidden");
  }
  return access;
}

async function getSubmissionWithCreatorOrThrow(id: string) {
  const db = requireDb();
  const [row] = await db
    .select({
      id: videoSubmissions.id,
      creatorId: videoSubmissions.creatorId,
      title: videoSubmissions.title,
      platform: videoSubmissions.platform,
      videoUrl: videoSubmissions.videoUrl,
      description: videoSubmissions.description,
      thumbnail: videoSubmissions.thumbnail,
      duration: videoSubmissions.duration,
      hashtags: videoSubmissions.hashtags,
      status: videoSubmissions.status,
      reviewNote: videoSubmissions.reviewNote,
      reviewedBy: videoSubmissions.reviewedBy,
      reviewedAt: videoSubmissions.reviewedAt,
      publishedAt: videoSubmissions.publishedAt,
      createdAt: videoSubmissions.createdAt,
      updatedAt: videoSubmissions.updatedAt,
      creatorUserId: creators.userId,
    })
    .from(videoSubmissions)
    .innerJoin(creators, eq(videoSubmissions.creatorId, creators.id))
    .where(eq(videoSubmissions.id, id))
    .limit(1);
  if (!row) throw new Error("Submission not found");
  return row;
}

const LIST = "/admin/creators/submissions";

function revalidatePaths(submissionId?: string) {
  revalidatePath(LIST);
  revalidatePath("/admin/creators");
  if (submissionId) revalidatePath(`${LIST}/${submissionId}`);
}

export async function approveSubmission(formData: FormData) {
  await assertCreatorsAccess();
  const session = await auth();
  const db = requireDb();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid input.");

  const sub = await getSubmissionWithCreatorOrThrow(id);
  const allowed = VALID_TRANSITIONS[sub.status];
  if (!allowed?.has("approved")) throw new Error("Cannot approve in current status");

  await db
    .update(videoSubmissions)
    .set({
      status: "approved",
      reviewedBy: session?.user?.id ?? null,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(videoSubmissions.id, id));

  await db.insert(auditLogs).values({
    userId: session?.user?.id ?? null,
    action: "submission.approve",
    target: id,
    meta: JSON.stringify({ title: sub.title, platform: sub.platform }),
  });

  await notifySubmissionApproved(sub.creatorUserId, sub.title);

  revalidatePaths(id);
  redirect(`${LIST}/${id}?saved=approved`);
}

export async function rejectSubmission(formData: FormData) {
  await assertCreatorsAccess();
  const session = await auth();
  const db = requireDb();
  const id = String(formData.get("id") ?? "");
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();
  if (!id) throw new Error("Invalid input.");

  const sub = await getSubmissionWithCreatorOrThrow(id);
  const allowed = VALID_TRANSITIONS[sub.status];
  if (!allowed?.has("rejected")) throw new Error("Cannot reject in current status");

  await db
    .update(videoSubmissions)
    .set({
      status: "rejected",
      reviewedBy: session?.user?.id ?? null,
      reviewNote: reviewNote || null,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(videoSubmissions.id, id));

  await db.insert(auditLogs).values({
    userId: session?.user?.id ?? null,
    action: "submission.reject",
    target: id,
    meta: JSON.stringify({ title: sub.title, platform: sub.platform, reason: reviewNote }),
  });

  await notifySubmissionRejected(sub.creatorUserId, sub.title, reviewNote);

  revalidatePaths(id);
  redirect(`${LIST}/${id}?saved=rejected`);
}

export async function requestRevision(formData: FormData) {
  await assertCreatorsAccess();
  const session = await auth();
  const db = requireDb();
  const id = String(formData.get("id") ?? "");
  const reviewNote = String(formData.get("reviewNote") ?? "").trim();
  if (!id) throw new Error("Invalid input.");

  const sub = await getSubmissionWithCreatorOrThrow(id);
  const allowed = VALID_TRANSITIONS[sub.status];
  if (!allowed?.has("needs_revision")) throw new Error("Cannot request revision in current status");

  await db
    .update(videoSubmissions)
    .set({
      status: "needs_revision",
      reviewedBy: session?.user?.id ?? null,
      reviewNote: reviewNote || null,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(videoSubmissions.id, id));

  await db.insert(auditLogs).values({
    userId: session?.user?.id ?? null,
    action: "submission.request_revision",
    target: id,
    meta: JSON.stringify({ title: sub.title, platform: sub.platform, notes: reviewNote }),
  });

  await notifySubmissionNeedsRevision(sub.creatorUserId, sub.title, reviewNote);

  revalidatePaths(id);
  redirect(`${LIST}/${id}?saved=revision`);
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "@tcf/identity/auth";
import { requireCapability } from "@tcf/identity/authorization";
import { requireDb } from "@tcf/db";
import { posts, creators, auditLogs } from "@tcf/db/schema";
import {
  notifySubmissionApproved,
  notifySubmissionRejected,
  notifySubmissionNeedsRevision,
} from "../notifications";

const VALID_TRANSITIONS: Record<string, Set<string>> = {
  pending: new Set(["approved", "rejected", "needs_revision"]),
  needs_revision: new Set(["pending", "approved", "rejected"]),
};

async function assertCreatorsAccess() {
  const access = await requireCapability("creators:review");
  return access;
}

async function getSubmissionWithCreatorOrThrow(id: string) {
  const db = requireDb();
  const [row] = await db
    .select({
      id: posts.id,
      creatorId: posts.creatorId,
      title: posts.title,
      body: posts.body,
      imageUrl: posts.imageUrl,
      link: posts.link,
      hashtags: posts.hashtags,
      status: posts.status,
      reviewNote: posts.reviewNote,
      reviewedBy: posts.reviewedBy,
      reviewedAt: posts.reviewedAt,
      publishedAt: posts.publishedAt,
      createdAt: posts.createdAt,
      updatedAt: posts.updatedAt,
      creatorUserId: creators.userId,
    })
    .from(posts)
    .innerJoin(creators, eq(posts.creatorId, creators.id))
    .where(eq(posts.id, id))
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
    .update(posts)
    .set({
      status: "approved",
      reviewedBy: session?.user?.id ?? null,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));

  await db.insert(auditLogs).values({
    userId: session?.user?.id ?? null,
    action: "submission.approve",
    target: id,
    meta: JSON.stringify({ title: sub.title }),
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
    .update(posts)
    .set({
      status: "rejected",
      reviewedBy: session?.user?.id ?? null,
      reviewNote: reviewNote || null,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));

  await db.insert(auditLogs).values({
    userId: session?.user?.id ?? null,
    action: "submission.reject",
    target: id,
    meta: JSON.stringify({ title: sub.title, reason: reviewNote }),
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
    .update(posts)
    .set({
      status: "needs_revision",
      reviewedBy: session?.user?.id ?? null,
      reviewNote: reviewNote || null,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id));

  await db.insert(auditLogs).values({
    userId: session?.user?.id ?? null,
    action: "submission.request_revision",
    target: id,
    meta: JSON.stringify({ title: sub.title, notes: reviewNote }),
  });

  await notifySubmissionNeedsRevision(sub.creatorUserId, sub.title, reviewNote);

  revalidatePaths(id);
  redirect(`${LIST}/${id}?saved=revision`);
}

export async function deleteSubmission(formData: FormData) {
  await assertCreatorsAccess();
  const session = await auth();
  const db = requireDb();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid input.");

  const sub = await getSubmissionWithCreatorOrThrow(id);

  await db.delete(posts).where(eq(posts.id, id));

  await db.insert(auditLogs).values({
    userId: session?.user?.id ?? null,
    action: "submission.delete",
    target: id,
    meta: JSON.stringify({ title: sub.title }),
  });

  revalidatePaths();
  redirect(LIST);
}

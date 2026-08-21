"use server";

import { requireDb } from "@/db";
import { eq } from "drizzle-orm";
import { pipelineReviewQueue, pipelineCurriculumVersions } from "@/db/schema";
import { compileAndPublishCurriculum } from "@/lib/curriculum/extraction/compiler";
import { revalidatePath } from "next/cache";

export async function approveReview(queueId: string, versionId: string) {
  const db = requireDb();
  
  await db.transaction(async (tx) => {
    await tx.update(pipelineReviewQueue)
      .set({ status: "approved", reviewedAt: new Date() })
      .where(eq(pipelineReviewQueue.id, queueId));
      
    await tx.update(pipelineCurriculumVersions)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(pipelineCurriculumVersions.id, versionId));
  });
  
  revalidatePath(`/admin/pipeline/review`);
  revalidatePath(`/admin/pipeline/review/${queueId}`);
  return { success: true };
}

export async function rejectReview(queueId: string, versionId: string) {
  const db = requireDb();
  
  await db.transaction(async (tx) => {
    await tx.update(pipelineReviewQueue)
      .set({ status: "rejected", reviewedAt: new Date() })
      .where(eq(pipelineReviewQueue.id, queueId));
      
    await tx.update(pipelineCurriculumVersions)
      .set({ status: "deprecated", updatedAt: new Date() })
      .where(eq(pipelineCurriculumVersions.id, versionId));
  });
  
  revalidatePath(`/admin/pipeline/review`);
  revalidatePath(`/admin/pipeline/review/${queueId}`);
  return { success: true };
}

export async function publishCurriculum(versionId: string) {
  try {
    await compileAndPublishCurriculum(versionId);
    return { success: true };
  } catch (e: unknown) {
    console.error("Publish failed:", e);
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { requireDb } from "@/db";
import { certificates, auditLogs } from "@/db/schema";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { writeRawQuiz, isValidQuizJson } from "@/lib/admin-quizzes";
import { isContentWritable } from "@/lib/admin-content";

// Saves an edited quiz's raw JSON. Re-verifies access + capability because
// Server Actions are public endpoints.
export async function saveQuiz(formData: FormData) {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "content:edit")) {
    throw new Error("Forbidden");
  }
  if (!isContentWritable()) {
    throw new Error("Content is read-only in production.");
  }

  const track = String(formData.get("track") ?? "");
  const content = String(formData.get("content") ?? "");
  if (!track) throw new Error("Missing track.");

  if (!isValidQuizJson(content)) {
    redirect(`/admin/quizzes/${track}?error=json`);
  }

  writeRawQuiz(track, content);

  revalidatePath(`/admin/quizzes/${track}`);
  revalidatePath(`/quiz/${track}`);
  redirect(`/admin/quizzes/${track}?saved=1`);
}

// Revokes ONE certificate by row id (owner only, audited). Deliberately a
// single-record, manual action: historical legacy certificates are not
// mass-revoked — /verify already labels them as unverified — and any bulk
// revocation needs its own reviewed migration. Revocation keeps the row, so
// the public URL keeps resolving and shows the revoked state.
export async function revokeCertificate(formData: FormData) {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "settings:manage")) {
    throw new Error("Forbidden");
  }

  const db = requireDb();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid input.");

  const [row] = await db
    .update(certificates)
    .set({ status: "revoked" })
    .where(and(eq(certificates.id, id), eq(certificates.status, "valid")))
    .returning({ certId: certificates.certId });

  if (row) {
    const session = await auth();
    await db.insert(auditLogs).values({
      userId: session?.user?.id ?? null,
      action: "certificate.revoke",
      target: row.certId,
    });
    revalidatePath(`/verify/${row.certId}`);
  }

  revalidatePath("/admin/quizzes");
  redirect("/admin/quizzes?revoked=1");
}

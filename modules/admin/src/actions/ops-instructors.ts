"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@tcf/identity/auth";
import { requireDb } from "@tcf/db";
import { instructors, instructorTracks, auditLogs } from "@tcf/db/schema";
import { assertOps } from "../operations";
import { encryptField, EncryptionUnavailableError } from "@tcf/core/crypto";

const STATUSES = new Set(["contacting", "signed", "active", "paused"]);

const LIST = "/admin/operations/instructors";

// Records the action in the audit log (same pattern as settings/actions.ts).
async function logAudit(action: string, target: string, meta?: object) {
  const db = requireDb();
  const session = await auth();
  await db.insert(auditLogs).values({
    userId: session?.user?.id ?? null,
    action,
    target,
    meta: meta ? JSON.stringify(meta) : null,
  });
}

function revalidateInstructor(id?: string) {
  revalidatePath(LIST);
  if (id) revalidatePath(`${LIST}/${id}`);
}

export async function createInstructor(formData: FormData) {
  await assertOps();
  const db = requireDb();

  const name = String(formData.get("name") ?? "").trim();
  const specialty = String(formData.get("specialty") ?? "").trim();
  const status = String(formData.get("status") ?? "contacting");
  if (!name || !STATUSES.has(status)) redirect(`${LIST}?error=create`);

  const [row] = await db
    .insert(instructors)
    .values({
      name,
      specialty,
      status: status as typeof instructors.$inferInsert.status,
    })
    .returning({ id: instructors.id });
  await logAudit("instructor.create", row.id, { name });
  revalidateInstructor(row.id);
  redirect(`${LIST}/${row.id}?saved=1`);
}

export async function updateInstructor(formData: FormData) {
  await assertOps();
  const db = requireDb();

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const status = String(formData.get("status") ?? "");
  if (!id || !name || !STATUSES.has(status)) throw new Error("Invalid input.");

  const lastContent = String(formData.get("lastContentAt") ?? "").trim();

  await db
    .update(instructors)
    .set({
      name,
      specialty: String(formData.get("specialty") ?? "").trim(),
      status: status as typeof instructors.$inferInsert.status,
      email: String(formData.get("email") ?? "").trim() || null,
      phone: String(formData.get("phone") ?? "").trim() || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      contractUrl: String(formData.get("contractUrl") ?? "").trim() || null,
      lastContentAt: lastContent ? new Date(lastContent) : null,
      updatedAt: new Date(),
    })
    .where(eq(instructors.id, id));
  revalidateInstructor(id);
  redirect(`${LIST}/${id}?saved=1`);
}

// Finance fields — requires billing:manage on top of ops:manage, so the
// operations role can never write (or read back) payout data.
export async function updateInstructorPayout(formData: FormData) {
  await assertOps("billing:manage");
  const db = requireDb();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid input.");

  const payoutMethod = String(formData.get("payoutMethod") ?? "").trim();
  const bankDetails = String(formData.get("bankDetails") ?? "").trim();

  // Encrypt BOTH fields before touching the database: if encryption is
  // unavailable nothing is written (no plaintext, no half-updated row).
  let encrypted: { payoutMethod: string | null; bankDetails: string | null };
  try {
    encrypted = {
      payoutMethod: payoutMethod ? encryptField(payoutMethod) : null,
      bankDetails: bankDetails ? encryptField(bankDetails) : null,
    };
  } catch (error) {
    if (error instanceof EncryptionUnavailableError) {
      redirect(`${LIST}/${id}?error=encryption`);
    }
    throw error;
  }

  await db
    .update(instructors)
    .set({ ...encrypted, updatedAt: new Date() })
    .where(eq(instructors.id, id));
  await logAudit("instructor.payout.update", id);
  revalidateInstructor(id);
  redirect(`${LIST}/${id}?saved=payout`);
}

export async function addInstructorTrack(formData: FormData) {
  await assertOps();
  const db = requireDb();

  const id = String(formData.get("id") ?? "");
  const track = String(formData.get("track") ?? "").trim();
  if (!id || !track) throw new Error("Invalid input.");

  await db
    .insert(instructorTracks)
    .values({ instructorId: id, track })
    .onConflictDoNothing();
  revalidateInstructor(id);
  redirect(`${LIST}/${id}?saved=1`);
}

export async function removeInstructorTrack(formData: FormData) {
  await assertOps();
  const db = requireDb();

  const id = String(formData.get("id") ?? "");
  const track = String(formData.get("track") ?? "");
  if (!id || !track) throw new Error("Invalid input.");

  await db
    .delete(instructorTracks)
    .where(
      and(eq(instructorTracks.instructorId, id), eq(instructorTracks.track, track))
    );
  revalidateInstructor(id);
  redirect(`${LIST}/${id}?saved=1`);
}

export async function deleteInstructor(formData: FormData) {
  await assertOps();
  const db = requireDb();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid input.");

  await db.delete(instructors).where(eq(instructors.id, id));
  await logAudit("instructor.delete", id);
  revalidateInstructor();
  redirect(`${LIST}?saved=deleted`);
}

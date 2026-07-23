"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { requireDb } from "@/db";
import { instructors, instructorTracks, auditLogs } from "@/db/schema";
import { assertOps } from "@/lib/admin-operations";
import { formSchema, safeText, safeTextOptional, emailField } from "@/lib/validation";
import { checkRateLimit, rateLimitKey, getClientIp, Limits } from "@/lib/rate-limit";

const LIST = "/admin/operations/instructors";

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

const createInstructorSchema = formSchema({
  name: safeText,
  specialty: safeTextOptional,
  status: z.enum(["contacting", "signed", "active", "paused"]).default("contacting"),
});

export async function createInstructor(formData: FormData) {
  await assertOps();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-instructors", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = createInstructorSchema.safeParse(formData);
  if (!parsed.success) redirect(`${LIST}?error=create`);
  const db = requireDb();
  const { name, specialty, status } = parsed.data;

  const [row] = await db
    .insert(instructors)
    .values({ name, specialty, status })
    .returning({ id: instructors.id });
  await logAudit("instructor.create", row.id, { name });
  revalidateInstructor(row.id);
  redirect(`${LIST}/${row.id}?saved=1`);
}

const updateInstructorSchema = formSchema({
  id: z.string().min(1),
  name: safeText,
  status: z.enum(["contacting", "signed", "active", "paused"]),
  specialty: safeTextOptional,
  email: emailField,
  phone: safeTextOptional,
  notes: safeTextOptional,
  contractUrl: safeTextOptional,
  lastContentAt: z.string().optional().default(""),
});

export async function updateInstructor(formData: FormData) {
  await assertOps();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-instructors", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = updateInstructorSchema.safeParse(formData);
  if (!parsed.success) throw new Error("Invalid input.");
  const db = requireDb();
  const { id, name, status, specialty, email, phone, notes, contractUrl, lastContentAt } = parsed.data;

  await db
    .update(instructors)
    .set({
      name,
      specialty,
      status,
      email: email || null,
      phone: phone || null,
      notes: notes || null,
      contractUrl: contractUrl || null,
      lastContentAt: lastContentAt ? new Date(lastContentAt) : null,
      updatedAt: new Date(),
    })
    .where(eq(instructors.id, id));
  revalidateInstructor(id);
  redirect(`${LIST}/${id}?saved=1`);
}

const payoutSchema = formSchema({
  id: z.string().min(1),
  payoutMethod: safeTextOptional,
  bankDetails: safeTextOptional,
});

export async function updateInstructorPayout(formData: FormData) {
  await assertOps("billing:manage");
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-instructors", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = payoutSchema.safeParse(formData);
  if (!parsed.success) throw new Error("Invalid input.");
  const db = requireDb();
  const { id, payoutMethod, bankDetails } = parsed.data;

  await db
    .update(instructors)
    .set({
      payoutMethod: payoutMethod || null,
      bankDetails: bankDetails || null,
      updatedAt: new Date(),
    })
    .where(eq(instructors.id, id));
  await logAudit("instructor.payout.update", id);
  revalidateInstructor(id);
  redirect(`${LIST}/${id}?saved=payout`);
}

const trackOpSchema = formSchema({
  id: z.string().min(1),
  track: z.string().min(1).max(100),
});

export async function addInstructorTrack(formData: FormData) {
  await assertOps();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-instructors", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = trackOpSchema.safeParse(formData);
  if (!parsed.success) throw new Error("Invalid input.");
  const db = requireDb();
  const { id, track } = parsed.data;

  await db
    .insert(instructorTracks)
    .values({ instructorId: id, track })
    .onConflictDoNothing();
  revalidateInstructor(id);
  redirect(`${LIST}/${id}?saved=1`);
}

export async function removeInstructorTrack(formData: FormData) {
  await assertOps();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-instructors", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = trackOpSchema.safeParse(formData);
  if (!parsed.success) throw new Error("Invalid input.");
  const db = requireDb();
  const { id, track } = parsed.data;

  await db
    .delete(instructorTracks)
    .where(and(eq(instructorTracks.instructorId, id), eq(instructorTracks.track, track)));
  revalidateInstructor(id);
  redirect(`${LIST}/${id}?saved=1`);
}

export async function deleteInstructor(formData: FormData) {
  await assertOps();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-instructors", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = z.object({ id: z.string().min(1) }).safeParse({
    id: formData.get("id"),
  });
  if (!parsed.success) throw new Error("Invalid input.");
  const db = requireDb();
  const { id } = parsed.data;

  await db.delete(instructors).where(eq(instructors.id, id));
  await logAudit("instructor.delete", id);
  revalidateInstructor();
  redirect(`${LIST}?saved=deleted`);
}

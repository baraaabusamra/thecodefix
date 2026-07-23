"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { requireDb } from "@/db";
import { outreachContacts, auditLogs } from "@/db/schema";
import { assertOps } from "@/lib/admin-operations";
import { formSchema, safeText, safeTextOptional } from "@/lib/validation";
import { checkRateLimit, rateLimitKey, getClientIp, Limits } from "@/lib/rate-limit";

const LIST = "/admin/operations/outreach";

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

const updateSchema = formSchema({
  id: z.string().min(1),
  status: z.enum(["todo", "contacted", "replied", "done", "rejected"]),
  report: safeTextOptional,
});

export async function updateOutreach(formData: FormData) {
  await assertOps();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-outreach", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = updateSchema.safeParse(formData);
  if (!parsed.success) throw new Error("Invalid input.");
  const db = requireDb();
  const { id, status, report } = parsed.data;

  const userId = await currentUserId();
  await db
    .update(outreachContacts)
    .set({ status, report: report || null, updatedBy: userId, updatedAt: new Date() })
    .where(eq(outreachContacts.id, id));

  await db.insert(auditLogs).values({
    userId,
    action: "outreach.update",
    target: id,
    meta: JSON.stringify({ status, hasReport: !!report }),
  });

  revalidatePath(LIST);
  redirect(`${LIST}?saved=1`);
}

const addSchema = formSchema({
  guide: z.enum(["funding", "instructors"]),
  name: safeText,
  category: z.string().max(100).default("other"),
  url: safeTextOptional,
  description: safeTextOptional,
});

export async function addOutreach(formData: FormData) {
  await assertOps();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-outreach", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = addSchema.safeParse(formData);
  if (!parsed.success) redirect(`${LIST}?error=invalid`);
  const db = requireDb();
  const { guide, name, category, url, description } = parsed.data;

  const userId = await currentUserId();
  const [row] = await db
    .insert(outreachContacts)
    .values({ guide, category, name, url: url || null, description: description || null, updatedBy: userId })
    .returning({ id: outreachContacts.id });

  await db.insert(auditLogs).values({
    userId,
    action: "outreach.add",
    target: row.id,
    meta: JSON.stringify({ name, guide }),
  });

  revalidatePath(LIST);
  redirect(`${LIST}?saved=added`);
}

export async function deleteOutreach(formData: FormData) {
  await assertOps();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-outreach", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = z.object({ id: z.string().min(1) }).safeParse({ id: formData.get("id") });
  if (!parsed.success) throw new Error("Invalid input.");
  const db = requireDb();
  const { id } = parsed.data;

  await db.delete(outreachContacts).where(eq(outreachContacts.id, id));
  await db.insert(auditLogs).values({
    userId: await currentUserId(),
    action: "outreach.delete",
    target: id,
  });

  revalidatePath(LIST);
  redirect(`${LIST}?saved=deleted`);
}

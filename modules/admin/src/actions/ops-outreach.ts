"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@tcf/identity/auth";
import { requireDb } from "@tcf/db";
import { outreachContacts, auditLogs } from "@tcf/db/schema";
import { assertOps } from "../operations";

const LIST = "/admin/operations/outreach";
const STATUSES = new Set(["todo", "contacted", "replied", "done", "rejected"]);
const GUIDES = new Set(["funding", "instructors"]);

async function currentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Update a contact's status + outcome report. */
export async function updateOutreach(formData: FormData) {
  await assertOps();
  const db = requireDb();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const report = String(formData.get("report") ?? "").trim() || null;
  if (!id || !STATUSES.has(status)) throw new Error("Invalid input.");

  const userId = await currentUserId();
  await db
    .update(outreachContacts)
    .set({
      status: status as typeof outreachContacts.$inferInsert.status,
      report,
      updatedBy: userId,
      updatedAt: new Date(),
    })
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

/** Add a new contact manually (a body/person not in the seeded guides). */
export async function addOutreach(formData: FormData) {
  await assertOps();
  const db = requireDb();

  const guide = String(formData.get("guide") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || "other";
  const url = String(formData.get("url") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!GUIDES.has(guide) || !name) redirect(`${LIST}?error=invalid`);

  const userId = await currentUserId();
  const [row] = await db
    .insert(outreachContacts)
    .values({
      guide: guide as typeof outreachContacts.$inferInsert.guide,
      category,
      name,
      url,
      description,
      updatedBy: userId,
    })
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
  const db = requireDb();

  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid input.");

  await db.delete(outreachContacts).where(eq(outreachContacts.id, id));
  await db.insert(auditLogs).values({
    userId: await currentUserId(),
    action: "outreach.delete",
    target: id,
  });

  revalidatePath(LIST);
  redirect(`${LIST}?saved=deleted`);
}

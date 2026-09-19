"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { requireCapability } from "@/lib/authorization";
import { requireDb } from "@/db";
import { creators, auditLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

async function assertCreatorsAccess() {
  await requireCapability("creators:review");
}

async function setCreatorStatus(id: string, status: "active" | "suspended") {
  await assertCreatorsAccess();
  const session = await auth();
  const db = requireDb();

  await db.update(creators).set({ status, updatedAt: new Date() }).where(eq(creators.id, id));

  await db.insert(auditLogs).values({
    userId: session?.user?.id ?? null,
    action: status === "suspended" ? "creator.suspend" : "creator.activate",
    target: id,
    meta: null,
  });

  revalidatePath("/admin/creators");
  revalidatePath(`/admin/creators/${id}`);
}

export async function suspendCreator(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid input.");
  await setCreatorStatus(id, "suspended");
}

export async function activateCreator(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid input.");
  await setCreatorStatus(id, "active");
}

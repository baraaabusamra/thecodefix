"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireCapability } from "@tcf/identity/authorization";
import { requireDb } from "@tcf/db";
import { suggestions } from "@tcf/db/schema";

const STATUSES = new Set(["new", "planned", "done", "declined"]);

// Server Actions are public endpoints — re-verify access + capability here.
async function assertAccess() {
  await requireCapability("content:edit");
}

export async function setSuggestionStatus(formData: FormData) {
  await assertAccess();
  const db = requireDb();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !STATUSES.has(status)) throw new Error("Invalid input.");
  await db.update(suggestions).set({ status }).where(eq(suggestions.id, id));
  revalidatePath("/admin/suggestions");
}

export async function deleteSuggestion(formData: FormData) {
  await assertAccess();
  const db = requireDb();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Invalid input.");
  await db.delete(suggestions).where(eq(suggestions.id, id));
  revalidatePath("/admin/suggestions");
}

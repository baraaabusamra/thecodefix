"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { requireDb } from "@/db";
import { suggestions } from "@/db/schema";
import { checkRateLimit, rateLimitKey, getClientIp, Limits } from "@/lib/rate-limit";

async function assertAccess() {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "content:edit")) {
    throw new Error("Forbidden");
  }
}

const setStatusSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["new", "planned", "done", "declined"]),
});

export async function setSuggestionStatus(formData: FormData) {
  await assertAccess();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-suggestions", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = setStatusSchema.safeParse({ id: formData.get("id"), status: formData.get("status") });
  if (!parsed.success) throw new Error("Invalid input.");
  const db = requireDb();
  const { id, status } = parsed.data;
  await db.update(suggestions).set({ status }).where(eq(suggestions.id, id));
  revalidatePath("/admin/suggestions");
}

export async function deleteSuggestion(formData: FormData) {
  await assertAccess();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-suggestions", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = z.object({ id: z.string().min(1) }).safeParse({ id: formData.get("id") });
  if (!parsed.success) throw new Error("Invalid input.");
  const db = requireDb();
  const { id } = parsed.data;
  await db.delete(suggestions).where(eq(suggestions.id, id));
  revalidatePath("/admin/suggestions");
}

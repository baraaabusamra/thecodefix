"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { requireDb } from "@/db";
import { seoKeywords } from "@/db/schema";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { formSchema, safeText, safeTextOptional } from "@/lib/validation";
import { checkRateLimit, rateLimitKey, getClientIp, Limits } from "@/lib/rate-limit";

async function assertSeoAccess() {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "seo:manage")) {
    throw new Error("Forbidden");
  }
  return requireDb();
}

const addKeywordSchema = formSchema({
  keyword: safeText,
  targetPath: safeTextOptional,
});

export async function addKeyword(formData: FormData) {
  const db = await assertSeoAccess();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-seo", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = addKeywordSchema.safeParse(formData);
  if (!parsed.success) redirect("/admin/seo?error=keyword");
  const { keyword, targetPath } = parsed.data;

  const session = await auth();
  await db.insert(seoKeywords).values({
    keyword,
    targetPath: targetPath || null,
    createdBy: session?.user?.id ?? null,
  });
  revalidatePath("/admin/seo");
  redirect("/admin/seo?saved=1");
}

const updateKeywordSchema = formSchema({
  id: z.string().min(1),
  position: z.string().optional().default(""),
  notes: safeTextOptional,
});

export async function updateKeyword(formData: FormData) {
  const db = await assertSeoAccess();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-seo", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = updateKeywordSchema.safeParse(formData);
  if (!parsed.success) throw new Error("Missing id.");
  const { id, position: posRaw, notes } = parsed.data;

  const n = Number(posRaw);
  const position = posRaw !== "" && Number.isFinite(n) ? Math.trunc(n) : null;

  await db
    .update(seoKeywords)
    .set({ position, notes: notes || null, updatedAt: new Date() })
    .where(eq(seoKeywords.id, id));
  revalidatePath("/admin/seo");
  redirect("/admin/seo?saved=1");
}

export async function deleteKeyword(formData: FormData) {
  const db = await assertSeoAccess();
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-seo", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");
  const parsed = z.object({ id: z.string().min(1) }).safeParse({ id: formData.get("id") });
  if (parsed.success) await db.delete(seoKeywords).where(eq(seoKeywords.id, parsed.data.id));
  revalidatePath("/admin/seo");
  redirect("/admin/seo?deleted=1");
}

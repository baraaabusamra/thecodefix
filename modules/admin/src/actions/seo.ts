"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@tcf/identity/auth";
import { requireDb } from "@tcf/db";
import { seoKeywords } from "@tcf/db/schema";
import { requireCapability } from "@tcf/identity/authorization";

// Re-verifies access + capability (Server Actions are public endpoints) and
// returns the db client.
async function assertSeoAccess() {
  await requireCapability("seo:manage");
  return requireDb();
}

export async function addKeyword(formData: FormData) {
  const db = await assertSeoAccess();
  const keyword = String(formData.get("keyword") ?? "").trim();
  const targetPath = String(formData.get("targetPath") ?? "").trim() || null;
  if (!keyword) redirect("/admin/seo?error=keyword");

  const session = await auth();
  await db.insert(seoKeywords).values({
    keyword,
    targetPath,
    createdBy: session?.user?.id ?? null,
  });
  revalidatePath("/admin/seo");
  redirect("/admin/seo?saved=1");
}

export async function updateKeyword(formData: FormData) {
  const db = await assertSeoAccess();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Missing id.");

  const posRaw = String(formData.get("position") ?? "").trim();
  const n = Number(posRaw);
  const position = posRaw !== "" && Number.isFinite(n) ? Math.trunc(n) : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  await db
    .update(seoKeywords)
    .set({ position, notes, updatedAt: new Date() })
    .where(eq(seoKeywords.id, id));
  revalidatePath("/admin/seo");
  redirect("/admin/seo?saved=1");
}

export async function deleteKeyword(formData: FormData) {
  const db = await assertSeoAccess();
  const id = String(formData.get("id") ?? "");
  if (id) await db.delete(seoKeywords).where(eq(seoKeywords.id, id));
  revalidatePath("/admin/seo");
  redirect("/admin/seo?deleted=1");
}

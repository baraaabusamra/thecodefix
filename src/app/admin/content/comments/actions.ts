"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, desc } from "drizzle-orm";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { requireDb } from "@/db";
import { comments } from "@/db/schema";

export async function getPendingComments() {
  const db = requireDb();
  const rows = await db
    .select()
    .from(comments)
    .where(eq(comments.isApproved, false))
    .orderBy(desc(comments.createdAt));
  return rows;
}

export async function getAllComments() {
  const db = requireDb();
  return db
    .select()
    .from(comments)
    .orderBy(desc(comments.createdAt))
    .limit(200);
}

export async function approveComment(formData: FormData) {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "content:edit")) throw new Error("Forbidden");
  const id = formData.get("id") as string;
  if (!id) throw new Error("Missing id.");
  const db = requireDb();
  await db.update(comments).set({ isApproved: true }).where(eq(comments.id, id));
  revalidatePath("/admin/content/comments");
}

export async function deleteComment(formData: FormData) {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "content:edit")) throw new Error("Forbidden");
  const id = formData.get("id") as string;
  if (!id) throw new Error("Missing id.");
  const db = requireDb();
  await db.delete(comments).where(eq(comments.id, id));
  revalidatePath("/admin/content/comments");
}

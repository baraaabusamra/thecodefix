"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { requireDb } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { requireCapability } from "@/lib/authorization";
import { ROLES, type Role } from "@/lib/rbac";

// Changes a user's RBAC role and records the action in the audit log.
// Re-verifies access + capability (Server Actions are public endpoints).
export async function updateUserRole(formData: FormData) {
  await requireCapability("settings:manage");

  const db = requireDb();
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  if (!userId || !ROLES.includes(role)) throw new Error("Invalid input.");

  // Prevent self-demotion lockout: an owner can't strip their own access.
  const session = await auth();
  const actorId = session?.user?.id;
  if (actorId && actorId === userId && role !== "owner") {
    redirect("/admin/settings?error=self");
  }

  await db.update(users).set({ role }).where(eq(users.id, userId));
  await db.insert(auditLogs).values({
    userId: actorId ?? null,
    action: "user.role.update",
    target: userId,
    meta: JSON.stringify({ role }),
  });

  revalidatePath("/admin/settings");
  revalidatePath("/admin/users");
  redirect("/admin/settings?saved=1");
}

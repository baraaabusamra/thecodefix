"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { requireDb } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { resolveAdmin } from "@/lib/admin-access";
import { can, ROLES } from "@/lib/rbac";
import { checkRateLimit, rateLimitKey, getClientIp, Limits } from "@/lib/rate-limit";

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(ROLES as unknown as [string, ...string[]]),
});

export async function updateUserRole(formData: FormData) {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, "settings:manage")) {
    throw new Error("Forbidden");
  }
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-settings", ip), Limits.admin);
  if (!rl.allowed) throw new Error("Too many requests.");

  const parsed = updateRoleSchema.safeParse({ userId: formData.get("userId"), role: formData.get("role") });
  if (!parsed.success) throw new Error("Invalid input.");
  const { userId, role } = parsed.data as { userId: string; role: typeof users.$inferInsert.role };

  const session = await auth();
  const actorId = session?.user?.id;
  if (actorId && actorId === userId && role !== "owner") {
    redirect("/admin/settings?error=self");
  }

  const db = requireDb();
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

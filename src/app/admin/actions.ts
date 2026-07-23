"use server";

import { z } from "zod";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE } from "@/lib/admin-access";
import { checkRateLimit, rateLimitKey, getClientIp, Limits } from "@/lib/rate-limit";

const adminKeySchema = z.object({
  key: z.string().min(1, "Key is required"),
});

export async function submitAdminKey(formData: FormData) {
  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("admin-key", ip), Limits.auth);
  if (!rl.allowed) redirect("/admin?denied=1");

  const parsed = adminKeySchema.safeParse({ key: formData.get("key") });
  if (!parsed.success) redirect("/admin?denied=1");
  const { key } = parsed.data;

  if (key === process.env.ADMIN_TOKEN) {
    const store = await cookies();
    store.set(ADMIN_COOKIE, key, {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 8,
      secure: process.env.NODE_ENV === "production",
    });
    redirect("/admin");
  }
  redirect("/admin?denied=1");
}

export async function adminSignOut() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/");
}

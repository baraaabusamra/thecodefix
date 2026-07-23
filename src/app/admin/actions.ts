"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE } from "@/lib/admin-access";

// Validates the shared admin key and persists it as an httpOnly cookie so the
// token-gated panel stays authenticated across all /admin pages.
export async function submitAdminKey(formData: FormData) {
  const key = String(formData.get("key") ?? "");
  if (key && key === process.env.ADMIN_TOKEN) {
    const store = await cookies();
    store.set(ADMIN_COOKIE, key, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8, // 8 hours
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

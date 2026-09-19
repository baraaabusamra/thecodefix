"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE } from "@/lib/admin-access";
import {
  ADMIN_SESSION_MS,
  adminTokenModeAllowed,
  createAdminSessionValue,
  safeTokenEqual,
} from "@/lib/admin-token";
import { getClientIp, rateLimit } from "@/lib/rate-limit";

// Validates the shared admin key (token-mode fallback only — see
// src/lib/admin-token.ts) and stores an expiring HMAC session value, never
// the key itself, as an httpOnly cookie.
export async function submitAdminKey(formData: FormData) {
  const token = process.env.ADMIN_TOKEN;
  // Same policy as resolveAdmin: disabled in production unless explicitly
  // enabled, so this endpoint can't be used as a password oracle.
  if (!token || !adminTokenModeAllowed()) redirect("/admin?denied=1");

  // Brute-force brake (per instance; see rate-limit.ts). Checked before the
  // comparison so over-limit guesses are never evaluated.
  const ip = await getClientIp();
  if (!rateLimit(`admin-key:${ip}`, 5, 15 * 60 * 1000)) redirect("/admin?denied=1");

  const key = String(formData.get("key") ?? "");
  if (key && safeTokenEqual(key, token)) {
    const store = await cookies();
    store.set(ADMIN_COOKIE, createAdminSessionValue(token), {
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_MS / 1000,
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

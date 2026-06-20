import { cookies } from "next/headers";
import { auth } from "@/auth";
import { isDbEnabled } from "@/db";
import { isAuthEnabled } from "@/lib/flags";
import { can, type Role } from "@/lib/rbac";

// Resolves who may view the admin panel, and how.
//
// Preferred path: when both auth and the database are configured, access is
// granted by the signed-in user's RBAC role (`admin:view` capability).
//
// Fallback path: before the DB/auth are provisioned, a shared ADMIN_TOKEN
// gates the panel via an httpOnly cookie (set by the submitAdminKey action).
// Open with a warning when the token is unset. This keeps the panel usable
// end-to-end during early setup, and lets gating live in the admin layout.

export const ADMIN_COOKIE = "tcf_admin";

export type AdminAccess =
  | { ok: true; mode: "rbac" | "token"; role: Role; name?: string | null }
  | { ok: false; mode: "rbac"; reason: "signin" }
  | { ok: false; mode: "rbac"; reason: "forbidden"; role?: Role }
  | { ok: false; mode: "token"; reason: "key" };

function rbacActive(): boolean {
  return isAuthEnabled() && isDbEnabled();
}

export async function resolveAdmin(): Promise<AdminAccess> {
  if (rbacActive()) {
    const session = await auth();
    if (!session?.user) return { ok: false, mode: "rbac", reason: "signin" };
    const role = session.user.role;
    if (!can(role, "admin:view"))
      return { ok: false, mode: "rbac", reason: "forbidden", role };
    return { ok: true, mode: "rbac", role: role as Role, name: session.user.name };
  }

  const token = process.env.ADMIN_TOKEN;
  if (token) {
    const store = await cookies();
    if (store.get(ADMIN_COOKIE)?.value !== token)
      return { ok: false, mode: "token", reason: "key" };
  }
  return { ok: true, mode: "token", role: "owner" };
}

/** Lightweight check for whether to show the admin link in the header. */
export async function canSeeAdminLink(): Promise<boolean> {
  if (rbacActive()) {
    const session = await auth();
    return can(session?.user?.role, "admin:view");
  }
  return !!process.env.ADMIN_TOKEN;
}

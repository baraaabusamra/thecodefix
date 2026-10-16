import { cookies } from "next/headers";
import { auth } from "./auth";
import { isDbEnabled } from "@tcf/db";
import { isAuthEnabled } from "@tcf/core/flags";
import { can, type Role } from "./rbac";
import { adminTokenModeAllowed, verifyAdminSessionValue } from "./admin-token";

// Resolves who may view the admin panel, and how.
//
// Preferred path: when both auth and the database are configured, access is
// granted by the signed-in user's RBAC role (`admin:view` capability).
//
// Fallback path (see packages/identity/src/admin-token.ts for the full policy):
//   - development: a shared ADMIN_TOKEN gates the panel via an httpOnly
//     cookie (set by submitAdminKey); open with a warning when unset;
//   - production: FAIL CLOSED. Broken/missing auth configuration must never
//     silently turn per-user RBAC into a shared owner password. Token mode
//     only works as an explicit emergency switch (ADMIN_TOKEN_MODE=true with
//     a strong ADMIN_TOKEN).

export const ADMIN_COOKIE = "tcf_admin";

export type AdminAccess =
  | { ok: true; mode: "rbac" | "token"; role: Role; name?: string | null }
  | { ok: false; mode: "rbac"; reason: "signin" }
  | { ok: false; mode: "rbac"; reason: "forbidden"; role?: Role }
  | { ok: false; mode: "token"; reason: "key" | "disabled" };

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
  if (!token) {
    // No shared token configured. Allow only outside production (for early
    // local setup); in production FAIL CLOSED so the panel is never publicly
    // accessible when neither RBAC nor a token is set.
    if (process.env.NODE_ENV === "production") {
      return { ok: false, mode: "token", reason: "disabled" };
    }
    return { ok: true, mode: "token", role: "owner" };
  }
  if (!adminTokenModeAllowed()) {
    return { ok: false, mode: "token", reason: "disabled" };
  }
  const store = await cookies();
  if (!verifyAdminSessionValue(store.get(ADMIN_COOKIE)?.value, token))
    return { ok: false, mode: "token", reason: "key" };
  return { ok: true, mode: "token", role: "owner" };
}

/** Lightweight check for whether to show the admin link in the header. */
export async function canSeeAdminLink(): Promise<boolean> {
  if (rbacActive()) {
    const session = await auth();
    return can(session?.user?.role, "admin:view");
  }
  return adminTokenModeAllowed();
}

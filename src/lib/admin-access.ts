import { timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { isDbEnabled } from "@/db";
import { isAuthEnabled } from "@/lib/flags";
import { can, type Capability, type Role } from "@/lib/rbac";

// Constant-time string compare so the admin token can't be guessed by timing.
function timingSafeStrEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Constant-time string compare so the admin token can't be guessed by timing.
function timingSafeStrEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

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
  if (!token) {
    // No shared token configured. Allow only outside production (for early
    // local setup); in production FAIL CLOSED so the panel is never publicly
    // accessible when neither RBAC nor a token is set.
    if (process.env.NODE_ENV === "production") {
      return { ok: false, mode: "token", reason: "key" };
    }
    return { ok: true, mode: "token", role: "owner" };
  }
  const store = await cookies();
  const provided = store.get(ADMIN_COOKIE)?.value ?? "";
  if (!timingSafeStrEqual(provided, token))
    return { ok: false, mode: "token", reason: "key" };
  return { ok: true, mode: "token", role: "owner" };
}

/**
 * Assert the current admin session has a specific capability.
 * Redirects to the gate screen or admin home when the check fails.
 * Use at the top of admin page/layout server components (defence in depth).
 */
export async function requireAdminCapability(cap: Capability): Promise<AdminAccess & { ok: true }> {
  const access = await resolveAdmin();
  if (!access.ok) {
    if (access.mode === "token") redirect("/admin");
    if (access.reason === "signin") redirect("/login?callbackUrl=/admin");
    redirect("/admin");
  }
  if (!can(access.role, cap)) redirect("/admin");
  return access as AdminAccess & { ok: true };
}

/** Lightweight check for whether to show the admin link in the header. */
export async function canSeeAdminLink(): Promise<boolean> {
  if (rbacActive()) {
    const session = await auth();
    return can(session?.user?.role, "admin:view");
  }
  return !!process.env.ADMIN_TOKEN;
}

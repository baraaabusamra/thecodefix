import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Shared-secret (ADMIN_TOKEN) fallback for the admin panel — framework-free
// helpers so the policy is unit-testable. See resolveAdmin() in
// src/lib/admin-access.ts for where they are applied.
//
// Policy:
//   - Development: token mode works whenever ADMIN_TOKEN is set (convenience).
//   - Production: per-user RBAC is the ONLY normal path. If RBAC is
//     unavailable (missing AUTH_SECRET / OAuth provider / DATABASE_URL) the
//     panel FAILS CLOSED, unless an operator explicitly opts into emergency
//     token mode with ADMIN_TOKEN_MODE=true and a strong (>= 32 char) token.
//   - The browser never holds the token itself: the cookie is an expiring
//     HMAC derived from it, so a leaked cookie can't reveal the secret and
//     stops working after SESSION_MS or when ADMIN_TOKEN rotates.

export const ADMIN_SESSION_MS = 8 * 60 * 60 * 1000; // 8 hours
export const MIN_PRODUCTION_TOKEN_LENGTH = 32;

type Env = Record<string, string | undefined>;

/** Whether the shared-token fallback may be used at all in this environment. */
export function adminTokenModeAllowed(env: Env = process.env): boolean {
  const token = env.ADMIN_TOKEN;
  if (!token) return false;
  if (env.NODE_ENV !== "production") return true;
  return (
    env.ADMIN_TOKEN_MODE?.trim().toLowerCase() === "true" &&
    token.length >= MIN_PRODUCTION_TOKEN_LENGTH
  );
}

/** Constant-time string comparison that doesn't leak the length either. */
export function safeTokenEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

function sign(token: string, expiresAt: number): string {
  return createHmac("sha256", token)
    .update(`tcf-admin-session:v1:${expiresAt}`)
    .digest("base64url");
}

/** Cookie value for a freshly authenticated token-mode session. */
export function createAdminSessionValue(token: string, now = Date.now()): string {
  const expiresAt = now + ADMIN_SESSION_MS;
  return `v1.${expiresAt}.${sign(token, expiresAt)}`;
}

/** Verifies a cookie value produced by createAdminSessionValue. */
export function verifyAdminSessionValue(
  value: string | undefined,
  token: string,
  now = Date.now()
): boolean {
  if (!value) return false;
  const [version, expRaw, mac, ...rest] = value.split(".");
  if (version !== "v1" || !expRaw || !mac || rest.length > 0) return false;
  if (!/^\d{1,16}$/.test(expRaw)) return false;
  const expiresAt = Number(expRaw);
  // Expired, or claiming a lifetime longer than we ever issue.
  if (expiresAt <= now || expiresAt > now + ADMIN_SESSION_MS) return false;
  return safeTokenEqual(mac, sign(token, expiresAt));
}

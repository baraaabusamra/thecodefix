import { headers } from "next/headers";

// Minimal in-memory sliding-window limiter for public Server Actions. On
// Fluid Compute, instances are reused across requests, so this is meaningfully
// effective (not perfect — per-instance, resets on cold start). Right
// cost/benefit before reaching for Upstash; swap the internals later if abuse
// actually shows up.
const hits = new Map<string, number[]>();

/** Returns true if the call is allowed, false if the key is over its limit. */
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) {
    hits.set(key, arr);
    return false;
  }
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 10_000) hits.clear(); // memory cap — worst case, limits reset early
  return true;
}

/** Best-effort caller IP for anonymous-endpoint rate-limit keys. */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

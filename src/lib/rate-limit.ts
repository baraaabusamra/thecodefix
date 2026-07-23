import { headers } from "next/headers";

export type RateLimitConfig = {
  windowMs: number;
  max: number;
};

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitStore = {
  check(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number; resetAt: number };
};

const inMemoryStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of inMemoryStore) {
    if (entry.resetAt <= now) inMemoryStore.delete(key);
  }
}, 60_000);

const defaultStore: RateLimitStore = {
  check(key, config) {
    const now = Date.now();
    const entry = inMemoryStore.get(key);
    if (!entry || entry.resetAt <= now) {
      inMemoryStore.set(key, { count: 1, resetAt: now + config.windowMs });
      return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowMs };
    }
    if (entry.count >= config.max) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }
    entry.count++;
    return { allowed: true, remaining: config.max - entry.count, resetAt: entry.resetAt };
  },
};

let store: RateLimitStore = defaultStore;

export function setRateLimitStore(s: RateLimitStore) {
  store = s;
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim()
    || h.get("x-real-ip")
    || "unknown";
}

export function rateLimitKey(namespace: string, identifier: string): string {
  return `rl:${namespace}:${identifier}`;
}

export function checkRateLimit(key: string, config: RateLimitConfig) {
  return store.check(key, config);
}

export const Limits = {
  auth: { windowMs: 60_000, max: 5 },
  suggestion: { windowMs: 60_000, max: 20 },
  certificate: { windowMs: 60_000, max: 10 },
  progress: { windowMs: 60_000, max: 100 },
  admin: { windowMs: 60_000, max: 60 },
  general: { windowMs: 60_000, max: 30 },
} as const satisfies Record<string, RateLimitConfig>;

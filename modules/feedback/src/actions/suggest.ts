"use server";

import { auth } from "@tcf/identity/auth";
import { db } from "@tcf/db";
import { suggestions } from "@tcf/db/schema";
import { isAuthEnabled } from "@tcf/core/flags";
import { rateLimit, getClientIp } from "@tcf/core/rate-limit";

export type SuggestInput = {
  type: string;
  message: string;
  email?: string;
  // Honeypot: a hidden field real users never fill. Bots often do.
  website?: string;
};

const TYPES = new Set(["language", "feature", "other"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public endpoint — anyone can submit, so validate defensively and keep it
// cheap. Returns a generic result (never reveals why something was rejected).
export async function submitSuggestion(
  input: SuggestInput
): Promise<{ ok: boolean }> {
  // Silently swallow bot submissions (honeypot filled).
  if (input.website && input.website.trim() !== "") return { ok: true };

  if (!db) return { ok: false };

  const ip = await getClientIp();
  if (!rateLimit(`suggest:${ip}`, 5, 10 * 60 * 1000)) return { ok: false };

  const type = TYPES.has(input.type) ? input.type : "other";
  const message = String(input.message ?? "").trim();
  if (message.length < 3 || message.length > 1000) return { ok: false };

  const rawEmail = String(input.email ?? "").trim();
  const email =
    rawEmail && rawEmail.length <= 254 && EMAIL_RE.test(rawEmail)
      ? rawEmail
      : null;

  // Attribute to the signed-in user when auth is on (helps triage & anti-abuse).
  let userId: string | null = null;
  if (isAuthEnabled()) {
    const session = await auth();
    userId = session?.user?.id ?? null;
  }

  await db.insert(suggestions).values({ type, message, email, userId });
  return { ok: true };
}

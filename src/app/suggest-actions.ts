"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/db";
import { suggestions } from "@/db/schema";
import { isAuthEnabled } from "@/lib/flags";
import { sanitizeText } from "@/lib/sanitize";
import { checkRateLimit, rateLimitKey, getClientIp, Limits } from "@/lib/rate-limit";

export type SuggestInput = {
  type: string;
  message: string;
  email?: string;
  website?: string;
};

const submitSchema = z.object({
  type: z.enum(["language", "feature", "other"]).default("other"),
  message: z
    .string()
    .min(3, "Message too short")
    .max(1000, "Message too long")
    .transform(sanitizeText),
  email: z
    .string()
    .max(254)
    .email("Invalid email")
    .optional()
    .or(z.literal("")),
  website: z.string().optional(),
});

export async function submitSuggestion(
  input: SuggestInput
): Promise<{ ok: boolean }> {
  if (input.website && input.website.trim() !== "") return { ok: true };
  if (!db) return { ok: false };

  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("suggest", ip), Limits.suggestion);
  if (!rl.allowed) return { ok: false };

  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) return { ok: false };

  const { type, message, email } = parsed.data;
  const emailValue = email || null;

  let userId: string | null = null;
  if (isAuthEnabled()) {
    const session = await auth();
    userId = session?.user?.id ?? null;
  }

  await db.insert(suggestions).values({ type, message, email: emailValue, userId });
  return { ok: true };
}

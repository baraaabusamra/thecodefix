"use server";

import { db } from "@/db";
import { jobAlerts } from "@/db/schema";
import { getCountry } from "@/lib/job-search";
import { SPECIALTIES } from "@/lib/job-search";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export type JobAlertInput = {
  email: string;
  country: string;
  specialty?: string;
  // Honeypot: a hidden field real users never fill. Bots often do.
  website?: string;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public endpoint — anyone can submit, so validate defensively and keep it
// cheap. Returns a generic result (never reveals why something was rejected).
export async function subscribeJobAlert(
  input: JobAlertInput
): Promise<{ ok: boolean }> {
  if (input.website && input.website.trim() !== "") return { ok: true };

  if (!db) return { ok: false };

  const ip = await getClientIp();
  if (!rateLimit(`job-alert:${ip}`, 5, 10 * 60 * 1000)) return { ok: false };

  const email = String(input.email ?? "").trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return { ok: false };
  }

  if (!getCountry(input.country)) return { ok: false };

  const specialty = SPECIALTIES.some((s) => s.slug === input.specialty)
    ? input.specialty
    : null;

  await db
    .insert(jobAlerts)
    .values({ email, country: input.country, specialty })
    .onConflictDoNothing();

  return { ok: true };
}

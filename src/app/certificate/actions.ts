"use server";

import { eq, and, desc } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { certificates, examAttempts } from "@/db/schema";
import { getTrack } from "@/lib/content";
import { getQuiz } from "@/lib/quiz";
import { hasExamBank } from "@/lib/quiz-bank";
import { PASS_RATIO } from "@/lib/progress-types";
import { rateLimit } from "@/lib/rate-limit";

const CERTIFICATE_USER_TRACK_CONSTRAINT = "certificate_one_valid_per_user_track";

function isCertificateUserTrackConflict(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "NeonDbError" &&
    (error as { code?: unknown }).code === "23505" &&
    (error as { constraint?: unknown }).constraint ===
      CERTIFICATE_USER_TRACK_CONSTRAINT
  );
}

// Records a verifiable certificate for the signed-in user. Called from the
// (client) Certificate component when a user issues their certificate. The
// server decides whether to record — so the client needs no session knowledge:
// no DB or no session → silently no-op (the printable cert still works).
export async function issueCertificate(input: {
  certId: string;
  track: string;
  trackTitle: string;
  name: string;
  score: number;
  total: number;
  issuedAt: string;
}): Promise<{ recorded: boolean; certId?: string }> {
  if (!db) return { recorded: false };

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { recorded: false };

  if (!rateLimit(`cert:${userId}`, 10, 60 * 1000)) return { recorded: false };

  const track = String(input.track ?? "").trim();
  // Server Actions are public endpoints. Once a track has a server-graded
  // exam bank, its legacy client-reported-score action must be closed even if
  // the UI no longer renders the legacy component.
  if (!track || hasExamBank(track)) return { recorded: false };

  const trustedTrack = await getTrack(track);
  if (!trustedTrack) return { recorded: false };

  const certId = String(input.certId || "").trim();
  const name = String(input.name || "").trim();
  if (!certId || !name) return { recorded: false };

  // The client-supplied score/total can't be trusted (Server Actions are public
  // endpoints), so validate against the real quiz: the track must have a quiz,
  // the total must match the real question count, and the score must clear the
  // passing threshold. Blocks forged "100%" certificates.
  const score = Number(input.score);
  const total = Number(input.total);
  const quiz = getQuiz(track);
  if (!quiz) return { recorded: false };
  if (!Number.isFinite(score) || !Number.isFinite(total)) return { recorded: false };
  if (total !== quiz.questions.length) return { recorded: false };
  if (score < 0 || score > total) return { recorded: false };
  if (score / total < PASS_RATIO) return { recorded: false };

  // Idempotent: one row per certId.
  const existing = await db
    .select({ certId: certificates.certId })
    .from(certificates)
    .where(and(eq(certificates.certId, certId), eq(certificates.status, "valid")))
    .limit(1);
  if (existing[0]) return { recorded: true, certId: existing[0].certId };

  const existingForTrack = await db
    .select({ certId: certificates.certId })
    .from(certificates)
    .where(
      and(
        eq(certificates.userId, userId),
        eq(certificates.track, track),
        eq(certificates.status, "valid")
      )
    )
    .limit(1);
  if (existingForTrack[0]) {
    return { recorded: true, certId: existingForTrack[0].certId };
  }

  try {
    await db.insert(certificates).values({
      certId,
      userId,
      recipientName: name,
      track,
      // Never persist a display title supplied by the browser.
      trackTitle: trustedTrack.title,
      score,
      total,
      issuedAt: new Date(input.issuedAt),
    });
  } catch (error: unknown) {
    if (!isCertificateUserTrackConflict(error)) throw error;
    const concurrent = await db
      .select({ certId: certificates.certId })
      .from(certificates)
      .where(
        and(
          eq(certificates.userId, userId),
          eq(certificates.track, track),
          eq(certificates.status, "valid")
        )
      )
      .limit(1);
    if (!concurrent[0]) throw error;
    return { recorded: true, certId: concurrent[0].certId };
  }

  return { recorded: true, certId };
}

function sanitizeCertificateName(raw: string): string {
  // Strip C0 control chars and bidi override/embedding/isolate marks — a
  // printed certificate must never carry characters that could hide or
  // visually reorder its own text. Collapse whitespace, cap length. Never
  // trust client input as safe just because it is "just a name" — this
  // string is rendered on a public page and in downloadable/printable output.
  const CONTROL_AND_BIDI = /[\u0000-\u001F\u007F\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;
  return raw
    .replace(CONTROL_AND_BIDI, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

export type IssueSecureCertificateResult =
  | { ok: true; certId: string }
  | { ok: false; reason: "unauthenticated" | "not_eligible" | "invalid_name" | "unavailable" | "rate_limited" };

/**
 * The server-graded counterpart to issueCertificate() above, for tracks with
 * a real exam bank (currently: html — see src/lib/quiz-bank.ts hasExamBank).
 * Unlike issueCertificate(), this NEVER accepts a client-reported score:
 * eligibility and score are derived entirely from the latest passed,
 * server-graded exam_attempt row for this user+track. `name` is the only
 * client input, and it's cosmetic (what gets printed) — validated and
 * sanitized, never trusted as a security-relevant claim.
 */
export async function issueSecureCertificate(
  track: string,
  nameOrLegacyTrackTitle: string,
  legacyName?: string
): Promise<IssueSecureCertificateResult> {
  if (!db) return { ok: false, reason: "unavailable" };
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { ok: false, reason: "unauthenticated" };
  if (!rateLimit(`cert-secure:${userId}`, 10, 60 * 1000)) {
    return { ok: false, reason: "rate_limited" };
  }

  const normalizedTrack = String(track ?? "").trim();
  if (!normalizedTrack || !hasExamBank(normalizedTrack)) {
    return { ok: false, reason: "unavailable" };
  }
  const trustedTrack = await getTrack(normalizedTrack);
  if (!trustedTrack) return { ok: false, reason: "unavailable" };

  // Accept the former (track, trackTitle, name) call shape during rollout,
  // but ignore its untrusted title. New callers use (track, name).
  const cleanName = sanitizeCertificateName(
    String(legacyName ?? nameOrLegacyTrackTitle ?? "")
  );
  if (!cleanName) return { ok: false, reason: "invalid_name" };

  // Idempotent: one certificate per (user, track) — return the existing one
  // rather than erroring or creating a duplicate.
  const existing = await db
    .select()
    .from(certificates)
    .where(
      and(
        eq(certificates.userId, userId),
        eq(certificates.track, normalizedTrack),
        eq(certificates.status, "valid")
      )
    )
    .limit(1);
  if (existing[0]) return { ok: true, certId: existing[0].certId };

  const passedAttempts = await db
    .select()
    .from(examAttempts)
    .where(
      and(
        eq(examAttempts.userId, userId),
        eq(examAttempts.track, normalizedTrack),
        eq(examAttempts.status, "graded"),
        eq(examAttempts.passed, true)
      )
    )
    .orderBy(desc(examAttempts.submittedAt))
    .limit(1);
  const attempt = passedAttempts[0];
  if (!attempt) return { ok: false, reason: "not_eligible" };

  const certId = `TCF-${crypto.randomUUID()}`;
  try {
    await db.insert(certificates).values({
      certId,
      userId,
      recipientName: cleanName,
      track: normalizedTrack,
      trackTitle: trustedTrack.title,
      score: attempt.score ?? 0,
      total: attempt.total,
      examAttemptId: attempt.id,
    });
  } catch (error: unknown) {
    if (!isCertificateUserTrackConflict(error)) throw error;
    const concurrent = await db
      .select({ certId: certificates.certId })
      .from(certificates)
      .where(
        and(
          eq(certificates.userId, userId),
          eq(certificates.track, normalizedTrack),
          eq(certificates.status, "valid")
        )
      )
      .limit(1);
    if (!concurrent[0]) throw error;
    return { ok: true, certId: concurrent[0].certId };
  }

  return { ok: true, certId };
}

export type MyCertificateStatus =
  | { issued: true; certId: string; recipientName: string }
  | { issued: false };

/** Read-only: does the signed-in user already hold a certificate for this track? */
export async function getMyCertificateStatus(track: string): Promise<MyCertificateStatus> {
  if (!db) return { issued: false };
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { issued: false };

  const rows = await db
    .select()
    .from(certificates)
    .where(
      and(
        eq(certificates.userId, userId),
        eq(certificates.track, track),
        eq(certificates.status, "valid")
      )
    )
    .limit(1);
  const row = rows[0];
  if (!row) return { issued: false };
  return { issued: true, certId: row.certId, recipientName: row.recipientName };
}

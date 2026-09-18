"use server";

import { eq, and, desc, notExists } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { certificates, examAttempts } from "@/db/schema";
import { getTrack } from "@/lib/content";
import { hasExamBank } from "@/lib/quiz-bank";
import { rateLimit } from "@/lib/rate-limit";
import { isUniqueViolation } from "@/lib/db-errors";

const CERTIFICATE_USER_TRACK_CONSTRAINT = "certificate_one_valid_per_user_track";

function isCertificateUserTrackConflict(error: unknown): boolean {
  return isUniqueViolation(error, CERTIFICATE_USER_TRACK_CONSTRAINT);
}

// LEGACY — permanently closed (Phase 0 security hardening).
//
// This action used to persist a "verified" certificate from a score the
// browser reported (localStorage quiz results), for every track without a
// server-graded exam bank. Server Actions are public endpoints, so anyone
// signed in could mint a verified certificate with any score, name and
// back-dated issue date. A database-backed certificate may now ONLY be
// created by issueSecureCertificate(), from a server-graded exam attempt.
//
// Kept as an exported no-op (instead of deleted) so a stale client bundle
// that still calls it gets a clean refusal rather than an error. It never
// reads its input and never writes.
export async function issueCertificate(input: {
  certId: string;
  track: string;
  trackTitle: string;
  name: string;
  score: number;
  total: number;
  issuedAt: string;
}): Promise<{ recorded: boolean; certId?: string }> {
  void input;
  return { recorded: false };
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
        eq(examAttempts.passed, true),
        // An attempt that already backed a certificate — including a REVOKED
        // one — can't back another: otherwise revocation could be undone by
        // simply re-issuing. Re-earning requires a new passed attempt.
        notExists(
          db
            .select({ id: certificates.id })
            .from(certificates)
            .where(eq(certificates.examAttemptId, examAttempts.id))
        )
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
  | { issued: true; certId: string; recipientName: string; issuedAt: string }
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
  return {
    issued: true,
    certId: row.certId,
    recipientName: row.recipientName,
    // The printed date must be when the certificate was earned, not when it
    // happens to be reopened — a reprint years later still shows the truth.
    issuedAt: row.issuedAt.toISOString(),
  };
}

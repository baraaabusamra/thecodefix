"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { certificates } from "@/db/schema";
import { getQuiz } from "@/lib/quiz";
import { PASS_RATIO } from "@/lib/progress-types";
import { rateLimit } from "@/lib/rate-limit";

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
}): Promise<{ recorded: boolean }> {
  if (!db) return { recorded: false };

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { recorded: false };

  if (!rateLimit(`cert:${userId}`, 10, 60 * 1000)) return { recorded: false };

  const certId = String(input.certId || "").trim();
  const name = String(input.name || "").trim();
  if (!certId || !name) return { recorded: false };

  // The client-supplied score/total can't be trusted (Server Actions are public
  // endpoints), so validate against the real quiz: the track must have a quiz,
  // the total must match the real question count, and the score must clear the
  // passing threshold. Blocks forged "100%" certificates.
  const track = String(input.track);
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
    .select({ id: certificates.id })
    .from(certificates)
    .where(eq(certificates.certId, certId))
    .limit(1);
  if (existing.length) return { recorded: true };

  await db.insert(certificates).values({
    certId,
    userId,
    recipientName: name,
    track,
    trackTitle: String(input.trackTitle),
    score,
    total,
    issuedAt: new Date(input.issuedAt),
  });

  return { recorded: true };
}

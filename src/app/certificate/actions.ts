"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { certificates } from "@/db/schema";
import { getQuiz } from "@/lib/quiz";
import { PASS_RATIO } from "@/lib/progress-types";
import { sanitizeText } from "@/lib/sanitize";
import { checkRateLimit, rateLimitKey, getClientIp, Limits } from "@/lib/rate-limit";

const issueSchema = z.object({
  certId: z.string().min(1).max(100),
  track: z.string().min(1).max(100),
  trackTitle: z.string().min(1).max(200),
  name: z.string().min(1).max(200).transform(sanitizeText),
  score: z.number().int().min(0),
  total: z.number().int().min(1),
  issuedAt: z.string().min(1),
});

export async function issueCertificate(
  input: z.infer<typeof issueSchema>
): Promise<{ recorded: boolean }> {
  if (!db) return { recorded: false };

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return { recorded: false };

  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("cert", userId ?? ip), Limits.certificate);
  if (!rl.allowed) return { recorded: false };

  const parsed = issueSchema.safeParse(input);
  if (!parsed.success) return { recorded: false };

  const { certId, track, trackTitle, name, score, total, issuedAt } = parsed.data;

  const quiz = getQuiz(track);
  if (!quiz) return { recorded: false };
  if (total !== quiz.questions.length) return { recorded: false };
  if (score < 0 || score > total) return { recorded: false };
  if (score / total < PASS_RATIO) return { recorded: false };

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
    trackTitle,
    score,
    total,
    issuedAt: new Date(issuedAt),
  });

  return { recorded: true };
}

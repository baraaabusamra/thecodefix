"use server";

import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { certificates } from "@/db/schema";

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

  const certId = String(input.certId || "").trim();
  const name = String(input.name || "").trim();
  if (!certId || !name) return { recorded: false };

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
    track: String(input.track),
    trackTitle: String(input.trackTitle),
    score: Number(input.score) || 0,
    total: Number(input.total) || 0,
    issuedAt: new Date(input.issuedAt),
  });

  return { recorded: true };
}

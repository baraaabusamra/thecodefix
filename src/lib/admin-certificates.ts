import { db } from "@/db";
import { certificates, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import type { Certificate } from "@/db/schema";

// Certificate queries. Return `null` when the database is off so pages can
// show a "needs database" / "verification unavailable" state.

export type CertificateRow = {
  id: string;
  certId: string;
  recipientName: string;
  track: string;
  trackTitle: string;
  score: number;
  total: number;
  issuedAt: Date;
  userEmail: string | null;
};

export async function listCertificates(
  limit = 100
): Promise<CertificateRow[] | null> {
  if (!db) return null;
  return db
    .select({
      id: certificates.id,
      certId: certificates.certId,
      recipientName: certificates.recipientName,
      track: certificates.track,
      trackTitle: certificates.trackTitle,
      score: certificates.score,
      total: certificates.total,
      issuedAt: certificates.issuedAt,
      userEmail: users.email,
    })
    .from(certificates)
    .leftJoin(users, eq(certificates.userId, users.id))
    .orderBy(desc(certificates.issuedAt))
    .limit(limit);
}

/** Look up one certificate by its public code. `null` = DB off. */
export async function findCertificate(
  certId: string
): Promise<Certificate | null | undefined> {
  if (!db) return null;
  const rows = await db
    .select()
    .from(certificates)
    .where(eq(certificates.certId, certId.trim()))
    .limit(1);
  return rows[0]; // undefined when not found
}

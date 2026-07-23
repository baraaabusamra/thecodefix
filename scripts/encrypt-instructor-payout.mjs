import "dotenv/config";
import crypto from "node:crypto";
import { neon } from "@neondatabase/serverless";

// One-time backfill: encrypts any pre-existing plain-text instructor
// payoutMethod/bankDetails rows written before src/lib/crypto.ts existed.
// New writes are already encrypted by updateInstructorPayout(); reads
// already tolerate plain text via decryptField(), so this is safe to run
// at any time (and safe to re-run — already-encrypted rows are skipped).
// Usage: npm run encrypt-instructor-payout

const PREFIX = "enc:v1:";

const keyRaw = process.env.ENCRYPTION_KEY;
if (!keyRaw) {
  console.error("ENCRYPTION_KEY is not set — nothing to do.");
  process.exit(1);
}
const key = Buffer.from(keyRaw, "base64");
if (key.length !== 32) {
  console.error("ENCRYPTION_KEY must decode to exactly 32 bytes.");
  process.exit(1);
}

function encryptField(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

const sql = neon(process.env.DATABASE_URL);

const rows = await sql`
  SELECT id, "payoutMethod", "bankDetails" FROM instructor
  WHERE ("payoutMethod" IS NOT NULL AND "payoutMethod" NOT LIKE ${PREFIX + "%"})
     OR ("bankDetails" IS NOT NULL AND "bankDetails" NOT LIKE ${PREFIX + "%"})
`;

console.log(`${rows.length} instructor row(s) with plain-text finance fields.`);

for (const row of rows) {
  const payoutMethod = row.payoutMethod ? encryptField(row.payoutMethod) : null;
  const bankDetails = row.bankDetails ? encryptField(row.bankDetails) : null;
  await sql`
    UPDATE instructor
    SET "payoutMethod" = ${payoutMethod}, "bankDetails" = ${bankDetails}
    WHERE id = ${row.id}
  `;
  console.log(`  encrypted ${row.id}`);
}

console.log("Done.");

import crypto from "node:crypto";

// At-rest encryption for a handful of sensitive text columns (currently:
// instructors.payoutMethod / bankDetails — real financial PII that was
// previously stored as plain text). AES-256-GCM, key from ENCRYPTION_KEY
// (32 raw bytes, base64-encoded).
//
// decryptField is deliberately tolerant of pre-encryption legacy values:
// existing rows written before this module existed are plain text with no
// "enc:v1:" prefix, and must keep reading back correctly rather than
// throwing, so this can ship without a synchronized backfill.

const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) return null;
  return key;
}

/** Encrypts `plain`. Returns `plain` unchanged if ENCRYPTION_KEY isn't set. */
export function encryptField(plain: string): string {
  const key = getKey();
  if (!key) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/**
 * Decrypts a value written by encryptField. Legacy plain-text values (no
 * "enc:v1:" prefix) and anything that fails to decrypt (e.g. key rotated
 * without re-encrypting) are returned as-is rather than thrown.
 */
export function decryptField(value: string): string {
  if (!value.startsWith(PREFIX)) return value;
  const key = getKey();
  if (!key) return value;
  try {
    const buf = Buffer.from(value.slice(PREFIX.length), "base64");
    const iv = buf.subarray(0, 12);
    const authTag = buf.subarray(12, 28);
    const ciphertext = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch {
    return value;
  }
}

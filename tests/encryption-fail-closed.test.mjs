import test, { mock } from "node:test";
import assert from "node:assert";
import crypto from "node:crypto";

// Phase 0: sensitive fields (instructor payout / bank details) must never be
// stored as plaintext because ENCRYPTION_KEY is missing or wrong.

const updates = [];
const fakeDb = {
  update: () => ({
    set: (values) => ({
      where: async () => {
        updates.push(values);
      },
    }),
  }),
  insert: () => ({ values: async () => undefined }),
};
mock.module("@/db", { exports: { db: fakeDb, requireDb: () => fakeDb } });
mock.module("@/lib/admin-operations", { exports: { assertOps: async () => ({ ok: true }) } });
mock.module("@/auth", { exports: { auth: async () => ({ user: { id: "u1" } }) } });
mock.module("next/cache", { exports: { revalidatePath: () => {} } });
mock.module("next/navigation", {
  exports: {
    redirect: (to) => {
      throw Object.assign(new Error("NEXT_REDIRECT"), { to });
    },
  },
});

const { encryptField, decryptField, EncryptionUnavailableError } = await import(
  "../src/lib/crypto.ts"
);
const { updateInstructorPayout } = await import(
  "../src/app/admin/operations/instructors/actions.ts"
);

const SECRET = "IBAN SA03 8000 0000 6080 1016 7519";
const saved = { NODE_ENV: process.env.NODE_ENV, ENCRYPTION_KEY: process.env.ENCRYPTION_KEY };
function setEnv(nodeEnv, key) {
  process.env.NODE_ENV = nodeEnv;
  if (key === undefined) delete process.env.ENCRYPTION_KEY;
  else process.env.ENCRYPTION_KEY = key;
}
test.after(() => setEnv(saved.NODE_ENV, saved.ENCRYPTION_KEY));

test("production + missing key: encryptField throws (never returns plaintext)", () => {
  setEnv("production", undefined);
  assert.throws(() => encryptField(SECRET), EncryptionUnavailableError);
});

test("production + invalid key: encryptField throws", () => {
  for (const bad of ["", "not-base64!!", crypto.randomBytes(16).toString("base64")]) {
    setEnv("production", bad);
    assert.throws(() => encryptField(SECRET), EncryptionUnavailableError, bad);
  }
});

test("the error never contains the sensitive value", () => {
  setEnv("production", undefined);
  try {
    encryptField(SECRET);
  } catch (e) {
    assert.ok(!String(e.message).includes(SECRET));
    assert.ok(!String(e.stack).includes(SECRET));
  }
});

test("production + valid key: ciphertext only, and it round-trips", () => {
  setEnv("production", crypto.randomBytes(32).toString("base64"));
  const enc = encryptField(SECRET);
  assert.ok(enc.startsWith("enc:v1:"));
  assert.ok(!enc.includes(SECRET));
  assert.equal(decryptField(enc), SECRET);
});

test("development without a key keeps the local-setup convenience", () => {
  setEnv("development", undefined);
  assert.equal(encryptField("x"), "x");
});

test("updateInstructorPayout: no key in production → controlled failure, nothing written", async () => {
  setEnv("production", undefined);
  updates.length = 0;
  const fd = new FormData();
  fd.set("id", "i1");
  fd.set("payoutMethod", "bank");
  fd.set("bankDetails", SECRET);
  await assert.rejects(updateInstructorPayout(fd), (e) =>
    e.to === "/admin/operations/instructors/i1?error=encryption"
  );
  assert.equal(updates.length, 0);
});

test("updateInstructorPayout: with a key, only ciphertext reaches the database", async () => {
  setEnv("production", crypto.randomBytes(32).toString("base64"));
  updates.length = 0;
  const fd = new FormData();
  fd.set("id", "i1");
  fd.set("payoutMethod", "bank");
  fd.set("bankDetails", SECRET);
  await assert.rejects(updateInstructorPayout(fd), (e) => e.to?.endsWith("?saved=payout"));
  assert.equal(updates.length, 1);
  assert.ok(updates[0].bankDetails.startsWith("enc:v1:"));
  assert.ok(!JSON.stringify(updates[0]).includes(SECRET));
});

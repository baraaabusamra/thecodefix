import test, { mock } from "node:test";
import assert from "node:assert";
import { eq } from "drizzle-orm";
import { renderToStaticMarkup } from "react-dom/server";
import { createTestDb, dbModuleExports, createUser } from "./helpers/pglite.mjs";
import { makeExamEligible, answerExam } from "./helpers/exam.mjs";

// End-to-end certificate integrity on a real Postgres (PGlite), with the REAL
// exam actions, REAL html question bank, REAL certificate actions and the
// REAL /verify page:
//   exam attempt → server grading → pass → certificate → verify route
// plus: fail → no certificate; legacy → unverified; revoked → revoked;
// tampered client score → refused/ignored; duplicate issuance → one row.

const { db, schema } = await createTestDb();
mock.module("@tcf/db", { exports: dbModuleExports(db) });

let currentUser = null;
let adminRole = "owner";
mock.module("@tcf/identity/auth", {
  exports: { auth: async () => (currentUser ? { user: { id: currentUser, role: "student" } } : null) },
});
mock.module("@tcf/identity/admin-access", {
  exports: { resolveAdmin: async () => ({ ok: true, mode: "rbac", role: adminRole }) },
});
mock.module("@tcf/core/rate-limit", { exports: { rateLimit: () => true, getClientIp: async () => "t" } });
mock.module("@tcf/content/tracks", {
  exports: { getTrack: async (t) => (t === "html" ? { slug: "html", title: "HTML" } : null) },
});
mock.module("next/cache", { exports: { revalidatePath: () => {}, updateTag: () => {} } });
mock.module("next/navigation", {
  exports: {
    redirect: (to) => {
      throw Object.assign(new Error("NEXT_REDIRECT"), { to });
    },
    notFound: () => {
      throw new Error("NEXT_NOT_FOUND");
    },
  },
});

const exam = await import("../modules/assessment/src/actions/exam.ts");
const certs = await import("../modules/certificates/src/actions/certificate.ts");
const { revokeCertificate } = await import("../modules/assessment/src/actions/admin-quizzes.ts");
const { getRequiredLessons } = await import("../modules/assessment/src/requirements.ts");
const { default: VerifyPage } = await import("../apps/web/src/app/verify/[certificateId]/page.tsx");

async function takeExam(correct) {
  currentUser = await createUser(db);
  await makeExamEligible(db, currentUser, getRequiredLessons("html"));
  const start = await exam.startOrResumeExam("html");
  assert.equal(start.ok, true, JSON.stringify(start));
  await answerExam(db, exam, start.attemptId, start.questions, correct);
  return exam.submitExam(start.attemptId);
}
async function verifyHtml(certId) {
  const el = await VerifyPage({ params: Promise.resolve({ certificateId: certId }) });
  return renderToStaticMarkup(el);
}
async function certRows(userId) {
  return db.select().from(schema.certificates).where(eq(schema.certificates.userId, userId));
}

test("pass → server-graded certificate → /verify shows it as verified", async () => {
  const result = await takeExam(34);
  assert.equal(result.passed, true);
  const issued = await certs.issueSecureCertificate("html", "Layla Ahmad");
  assert.equal(issued.ok, true);

  const [row] = await certRows(currentUser);
  assert.equal(row.certId, issued.certId);
  assert.ok(row.certId.startsWith("TCF-"), "certId is generated server-side");
  assert.equal(row.score, 34);
  assert.equal(row.total, 40);
  assert.ok(row.examAttemptId, "linked to the server-graded attempt");
  const [attempt] = await db.select().from(schema.examAttempts).where(eq(schema.examAttempts.id, row.examAttemptId));
  assert.equal(attempt.passed, true);

  const html = await verifyHtml(issued.certId);
  assert.match(html, /✓ شهادة موثّقة/);
  assert.match(html, /Layla Ahmad/);
  assert.match(html, /34\/40/);
});

test("fail → no certificate can be issued", async () => {
  const result = await takeExam(20);
  assert.equal(result.passed, false);
  assert.deepStrictEqual(await certs.issueSecureCertificate("html", "Name"), { ok: false, reason: "not_eligible" });
  assert.equal((await certRows(currentUser)).length, 0);
});

test("tampered client score is refused (legacy) and can't be injected (secure)", async () => {
  currentUser = await createUser(db);
  const legacy = await certs.issueCertificate({
    certId: "TCF-HTML-FORGED",
    track: "python",
    trackTitle: "Python",
    name: "Forger",
    score: 999999,
    total: 10,
    issuedAt: "2020-01-01T00:00:00Z",
  });
  assert.deepStrictEqual(legacy, { recorded: false });
  // The secure action has no score parameter at all; extra client arguments
  // are ignored and nothing is issued without a passed attempt.
  assert.equal((await certs.issueSecureCertificate("html", "Forger", "x", 999999)).ok, false);
  assert.equal((await certRows(currentUser)).length, 0);
});

test("duplicate and concurrent issuance produce exactly one certificate", async () => {
  await takeExam(33);
  const results = await Promise.all(
    Array.from({ length: 5 }, () => certs.issueSecureCertificate("html", "Same Person"))
  );
  assert.ok(results.every((r) => r.ok), JSON.stringify(results));
  assert.equal(new Set(results.map((r) => r.certId)).size, 1);
  assert.equal((await certRows(currentUser)).length, 1);
  const again = await certs.issueSecureCertificate("html", "Different Name");
  assert.equal(again.certId, results[0].certId);
});

test("legacy record (no exam attempt) is shown as unverified", async () => {
  const userId = await createUser(db);
  await db.insert(schema.certificates).values({
    certId: "TCF-PYTHON-LEGACY1",
    userId,
    recipientName: "Old Record",
    track: "python",
    trackTitle: "Python",
    score: 10,
    total: 10,
  });
  const html = await verifyHtml("TCF-PYTHON-LEGACY1");
  assert.doesNotMatch(html, /✓ شهادة موثّقة/);
  assert.doesNotMatch(html, /10\/10/);
  assert.match(html, /غير موثّق/);
});

test("revoked → /verify shows revoked; only settings:manage can revoke", async () => {
  await takeExam(35);
  const issued = await certs.issueSecureCertificate("html", "To Be Revoked");
  const [row] = await certRows(currentUser);

  adminRole = "admin"; // no settings:manage
  const fd = new FormData();
  fd.set("id", row.id);
  await assert.rejects(revokeCertificate(fd), /Forbidden/);
  assert.match(await verifyHtml(issued.certId), /✓ شهادة موثّقة/);

  adminRole = "owner";
  await assert.rejects(revokeCertificate(fd), (e) => e.message === "NEXT_REDIRECT");
  const html = await verifyHtml(issued.certId);
  assert.match(html, /شهادة مُلغاة/);
  assert.doesNotMatch(html, /✓ شهادة موثّقة/);

  // Revocation can't be undone by re-issuing from the same attempt...
  assert.deepStrictEqual(await certs.issueSecureCertificate("html", "To Be Revoked"), {
    ok: false,
    reason: "not_eligible",
  });
  assert.equal((await certRows(currentUser)).filter((c) => c.status === "valid").length, 0);

  // ...only by passing a NEW server-graded attempt.
  const start = await exam.startOrResumeExam("html");
  assert.equal(start.ok, true, JSON.stringify(start));
  await answerExam(db, exam, start.attemptId, start.questions, 36);
  assert.equal((await exam.submitExam(start.attemptId)).passed, true);
  const reissued = await certs.issueSecureCertificate("html", "To Be Revoked");
  assert.equal(reissued.ok, true);
  assert.notEqual(reissued.certId, issued.certId);
});

test("unknown certificate id → invalid, never verified", async () => {
  const html = await verifyHtml("TCF-DOES-NOT-EXIST");
  assert.match(html, /شهادة غير صالحة/);
});

import test, { mock } from "node:test";
import assert from "node:assert";
import { renderToStaticMarkup } from "react-dom/server";

// Phase 0: legacy (client-reported-score) certificate issuance is closed, and
// legacy rows can never be presented as server-verified credentials.

const dbCalls = { select: 0, insert: 0, update: [] };
const fakeDb = {
  select() {
    dbCalls.select++;
    throw new Error("legacy issueCertificate must not query the database");
  },
  insert() {
    dbCalls.insert++;
    return { values: async () => undefined };
  },
  update() {
    return {
      set(values) {
        return {
          where() {
            return {
              returning: async () => {
                dbCalls.update.push(values);
                return [{ certId: "TCF-x" }];
              },
            };
          },
        };
      },
    };
  },
};

mock.module("@tcf/db", {
  exports: { db: fakeDb, requireDb: () => fakeDb, isDbEnabled: () => true },
});
mock.module("@tcf/identity/auth", { exports: { auth: async () => ({ user: { id: "u1" } }) } });
// A track WITHOUT a server-graded exam bank but WITH a legacy quiz — exactly
// the case the old action accepted.
mock.module("@tcf/assessment/quiz-bank", { exports: { hasExamBank: () => false } });
mock.module("@tcf/content/quizzes", {
  exports: { getQuiz: () => ({ questions: new Array(10).fill({}) }), hasQuiz: () => true },
});
mock.module("@tcf/content/tracks", {
  exports: { getTrack: async (t) => ({ slug: t, title: "Python" }) },
});
mock.module("@tcf/core/rate-limit", {
  exports: { rateLimit: () => true, getClientIp: async () => "test" },
});

let adminRole = "owner";
mock.module("@tcf/identity/admin-access", {
  exports: { resolveAdmin: async () => ({ ok: true, mode: "rbac", role: adminRole }) },
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

let storedCert;
mock.module("@tcf/certificates/certificates", {
  exports: {
    findCertificate: async () => storedCert,
    // Re-export the real classifier so the page uses production logic.
    certificateTrust: (c) =>
      c.status === "revoked" ? "revoked" : c.examAttemptId ? "verified" : "legacy",
  },
});

const { issueCertificate } = await import("../modules/certificates/src/actions/certificate.ts");

test("legacy issueCertificate never persists, even with a 'valid' passing score", async () => {
  const res = await issueCertificate({
    certId: "TCF-PYTHON-FORGED",
    track: "python",
    trackTitle: "Python",
    name: "Attacker",
    score: 10,
    total: 10,
    issuedAt: "2020-01-01T00:00:00.000Z",
  });
  assert.deepStrictEqual(res, { recorded: false });
  assert.equal(dbCalls.insert, 0);
  assert.equal(dbCalls.select, 0);
});

test("legacy issueCertificate refuses malformed/hostile input the same way", async () => {
  for (const input of [{}, null, { track: "../x", score: -1, total: 0 }]) {
    assert.deepStrictEqual(await issueCertificate(input), { recorded: false });
  }
  assert.equal(dbCalls.insert, 0);
});

// The real certificateTrust() is exercised unmocked in certificate-trust.test.mjs.

async function renderVerify(cert) {
  storedCert = cert;
  const { default: Page } = await import(
    `../apps/web/src/app/verify/[certificateId]/page.tsx?v=${Math.random()}`
  );
  const el = await Page({ params: Promise.resolve({ certificateId: "TCF-1" }) });
  return renderToStaticMarkup(el);
}

const base = {
  id: "row1",
  certId: "TCF-1",
  userId: "u1",
  recipientName: "Learner",
  track: "python",
  trackTitle: "Python",
  score: 10,
  total: 10,
  issuedAt: new Date("2026-01-01T00:00:00Z"),
  status: "valid",
};

test("/verify: a legacy certificate never shows the verified state or its score", async () => {
  const html = await renderVerify({ ...base, examAttemptId: null });
  assert.doesNotMatch(html, /✓ شهادة موثّقة/); // the verified-state title
  assert.doesNotMatch(html, /border-green-500/); // the verified-state styling
  assert.doesNotMatch(html, /10\/10/);
  assert.match(html, /غير موثّق/);
});

test("/verify: a server-graded certificate still shows the verified state", async () => {
  const html = await renderVerify({ ...base, examAttemptId: "attempt-1", score: 35, total: 40 });
  assert.match(html, /✓ شهادة موثّقة/);
  assert.match(html, /35\/40/);
});

test("/verify: a revoked certificate shows the revoked state", async () => {
  const html = await renderVerify({ ...base, examAttemptId: "attempt-1", status: "revoked" });
  assert.match(html, /شهادة مُلغاة/);
  assert.doesNotMatch(html, /✓ شهادة موثّقة/);
});

test("/verify metadata: legacy certificates get no personalized preview", async () => {
  storedCert = { ...base, examAttemptId: null };
  const { generateMetadata } = await import(
    `../apps/web/src/app/verify/[certificateId]/page.tsx?m=${Math.random()}`
  );
  const meta = await generateMetadata({ params: Promise.resolve({ certificateId: "TCF-1" }) });
  assert.equal(meta.openGraph, undefined);
  assert.doesNotMatch(String(meta.title), /Learner/);
});

test("revokeCertificate: admin (no settings:manage) is refused", async () => {
  adminRole = "admin";
  const { revokeCertificate } = await import(`../modules/assessment/src/actions/admin-quizzes.ts?r=${Math.random()}`);
  const fd = new FormData();
  fd.set("id", "row1");
  await assert.rejects(revokeCertificate(fd), /Forbidden/);
  assert.equal(dbCalls.update.length, 0);
});

test("revokeCertificate: owner revokes one certificate and it is audited", async () => {
  adminRole = "owner";
  const insertsBefore = dbCalls.insert;
  const { revokeCertificate } = await import(`../modules/assessment/src/actions/admin-quizzes.ts?r=${Math.random()}`);
  const fd = new FormData();
  fd.set("id", "row1");
  await assert.rejects(revokeCertificate(fd), (e) => e.to === "/admin/quizzes?revoked=1");
  assert.deepStrictEqual(dbCalls.update, [{ status: "revoked" }]);
  assert.equal(dbCalls.insert, insertsBefore + 1); // audit log row
});

import test, { mock } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { eq } from "drizzle-orm";
import { createTestDb, dbModuleExports, createUser } from "./helpers/pglite.mjs";

// End-to-end AI/ML secure exam + verified certificate on a real Postgres
// (PGlite), driving the REAL exam actions, the REAL ai-ml question bank and
// the REAL certificate actions.
//
// AI/ML is the first track on the `final_exam_only` prerequisite policy: it
// has no per-lesson secure quiz banks, so the final exam is the only gate.
// Everything else about the secure flow must still hold — authentication,
// server-side selection from the 90-question pool, an answer key that never
// reaches the client, server grading, the 32/40 pass mark, and a certificate
// that can only be minted from a real passed attempt.

const { db, schema } = await createTestDb();
mock.module("@/db", { exports: dbModuleExports(db) });

let currentUser = null;
mock.module("@/auth", {
  exports: {
    auth: async () =>
      currentUser ? { user: { id: currentUser, role: "student" } } : null,
  },
});
mock.module("@/lib/rate-limit", {
  exports: { rateLimit: () => true, getClientIp: async () => "t" },
});
mock.module("@/lib/content", {
  exports: {
    getTrack: async (t) =>
      t === "ai-ml"
        ? { slug: "ai-ml", title: "الذكاء الاصطناعي وتعلّم الآلة" }
        : null,
  },
});
mock.module("next/cache", {
  exports: { revalidatePath: () => {}, updateTag: () => {} },
});
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

const exam = await import("../src/app/quiz/[tech]/exam-actions.ts");
const certs = await import("../src/app/certificate/actions.ts");

const BANK = JSON.parse(
  fs.readFileSync("src/content/quiz-bank/ai-ml/exam.json", "utf8")
).questions;
const BY_ID = new Map(BANK.map((q) => [q.id, q]));

/** The index, within the shuffled options the learner was shown, of the right answer. */
async function correctShuffledIndex(attemptId, questionId) {
  const [row] = await db
    .select({ optionOrder: schema.examAttempts.optionOrder })
    .from(schema.examAttempts)
    .where(eq(schema.examAttempts.id, attemptId));
  const order = JSON.parse(row.optionOrder)[questionId];
  return order.indexOf(BY_ID.get(questionId).answer);
}

/** Answers `correctCount` questions right and the rest deliberately wrong. */
async function answer(attemptId, questions, correctCount) {
  for (const [i, q] of questions.entries()) {
    const right = await correctShuffledIndex(attemptId, q.id);
    const choice = i < correctCount ? right : (right + 1) % q.options.length;
    const res = await exam.saveExamAnswer(attemptId, q.id, choice);
    if (!res.ok) throw new Error(`saveExamAnswer failed: ${res.reason}`);
  }
}

async function takeExam(correctCount) {
  currentUser = await createUser(db);
  const start = await exam.startOrResumeExam("ai-ml");
  assert.equal(start.ok, true, JSON.stringify(start));
  await answer(start.attemptId, start.questions, correctCount);
  return { start, result: await exam.submitExam(start.attemptId) };
}

// ── Eligibility under the final_exam_only policy ─────────────────────────

test("AI/ML: a signed-in learner is eligible with zero lesson quizzes passed", async () => {
  currentUser = await createUser(db);
  const rows = await db
    .select()
    .from(schema.lessonQuizAttempts)
    .where(eq(schema.lessonQuizAttempts.userId, currentUser));
  assert.equal(rows.length, 0, "precondition: no lesson quiz attempts");

  assert.deepStrictEqual(await exam.getExamEligibility("ai-ml"), {
    eligible: true,
  });
});

test("AI/ML: a guest is never eligible — authentication is still required", async () => {
  currentUser = null;
  const eligibility = await exam.getExamEligibility("ai-ml");
  assert.equal(eligibility.eligible, false);
  assert.equal(eligibility.reason, "unauthenticated");

  const start = await exam.startOrResumeExam("ai-ml");
  assert.equal(start.ok, false);
  assert.equal(start.reason, "unauthenticated");
});

test("an unconfigured track fails closed even for a signed-in learner", async () => {
  currentUser = await createUser(db);
  const eligibility = await exam.getExamEligibility("no-such-track");
  assert.equal(eligibility.eligible, false);
  assert.equal(
    eligibility.reason,
    "unavailable",
    "a track with no declared prerequisite policy must never become eligible"
  );
});

test("prototype-chain track names fail closed instead of throwing", async () => {
  currentUser = await createUser(db);

  // `track` arrives from a route param / Server Action argument. A plain
  // object literal inherits from Object.prototype, so a lookup like
  // EXAM_PREREQUISITES["__proto__"] returns an inherited member: truthy
  // enough to pass a `!policy` guard, then undefined on `.requiredLessons`.
  for (const hostile of ["__proto__", "toString", "constructor", "valueOf"]) {
    const eligibility = await exam.getExamEligibility(hostile);
    assert.equal(
      eligibility.eligible,
      false,
      `${hostile} must never be eligible`
    );
    assert.equal(eligibility.reason, "unavailable");

    const start = await exam.startOrResumeExam(hostile);
    assert.equal(start.ok, false, `${hostile} must not start an attempt`);
  }
});

// ── Exam selection and the answer-key boundary ───────────────────────────

test("AI/ML: an attempt draws 40 distinct questions from the 90-question pool", async () => {
  currentUser = await createUser(db);
  const start = await exam.startOrResumeExam("ai-ml");
  assert.equal(start.ok, true);
  assert.equal(start.questions.length, 40);

  const ids = start.questions.map((q) => q.id);
  assert.equal(new Set(ids).size, 40, "questions must not repeat in an attempt");
  assert.ok(
    ids.every((id) => BY_ID.has(id)),
    "every served question must come from the ai-ml bank"
  );
  assert.equal(BANK.length, 90, "the pool it draws from is 90 questions");
});

test("AI/ML: the start payload never carries the answer key", async () => {
  currentUser = await createUser(db);
  const start = await exam.startOrResumeExam("ai-ml");
  assert.equal(start.ok, true);

  for (const q of start.questions) {
    assert.deepStrictEqual(
      Object.keys(q).sort(),
      ["id", "options", "q"],
      `question ${q.id} exposes more than id/q/options`
    );
  }

  // Belt and braces: no explanation text from the bank may appear anywhere in
  // the serialized payload the client receives.
  const payload = JSON.stringify(start);
  for (const q of BANK) {
    assert.ok(
      !payload.includes(q.explain),
      `explanation for ${q.id} leaked into the start payload`
    );
  }
});

test("AI/ML: two attempts get independently shuffled option orders", async () => {
  currentUser = await createUser(db);
  const a = await exam.startOrResumeExam("ai-ml");
  currentUser = await createUser(db);
  const b = await exam.startOrResumeExam("ai-ml");

  const shared = a.questions
    .map((q) => q.id)
    .filter((id) => b.questions.some((q) => q.id === id));
  assert.ok(shared.length > 0, "expected some overlap between two 40/90 draws");

  // With 4 options per question, identical ordering across every shared
  // question would mean the shuffle is not per-attempt.
  const orderOf = (start, id) =>
    start.questions.find((q) => q.id === id).options.join("|");
  const allIdentical = shared.every((id) => orderOf(a, id) === orderOf(b, id));
  assert.ok(!allIdentical, "option order must be shuffled per attempt");
});

// ── Grading, the pass mark, and the certificate ──────────────────────────

test("AI/ML: 32/40 passes and mints a verified certificate from the server's own score", async () => {
  const { result } = await takeExam(32);
  assert.equal(result.ok, true, JSON.stringify(result));
  assert.equal(result.score, 32);
  assert.equal(result.total, 40);
  assert.equal(result.passed, true, "32/40 is the pass mark");

  const issued = await certs.issueSecureCertificate("ai-ml", "ليلى أحمد");
  assert.equal(issued.ok, true, JSON.stringify(issued));

  const [row] = await db
    .select()
    .from(schema.certificates)
    .where(eq(schema.certificates.userId, currentUser));
  assert.equal(row.track, "ai-ml");
  assert.equal(row.status, "valid");
  assert.equal(row.recipientName, "ليلى أحمد");
  assert.equal(row.score, 32, "score is copied from the graded attempt row");
  assert.equal(row.total, 40);
  assert.ok(row.examAttemptId, "certificate is bound to the attempt that earned it");
  assert.ok(
    row.certId.startsWith("TCF-"),
    "certificate id is generated by the server"
  );
  // The title is read from the server's own track data, never from the client.
  assert.equal(row.trackTitle, "الذكاء الاصطناعي وتعلّم الآلة");
});

test("AI/ML: 31/40 fails and no certificate can be issued", async () => {
  const { result } = await takeExam(31);
  assert.equal(result.ok, true);
  assert.equal(result.score, 31);
  assert.equal(result.passed, false, "31/40 is below the 32/40 pass mark");

  const issued = await certs.issueSecureCertificate("ai-ml", "من رسب");
  assert.equal(issued.ok, false);
  assert.equal(issued.reason, "not_eligible");

  const rows = await db
    .select()
    .from(schema.certificates)
    .where(eq(schema.certificates.userId, currentUser));
  assert.deepStrictEqual(rows, [], "a failed attempt must persist no certificate");
});

test("AI/ML: a learner who never sat the exam cannot mint a certificate", async () => {
  currentUser = await createUser(db);
  const issued = await certs.issueSecureCertificate("ai-ml", "من لم يختبر");
  assert.equal(issued.ok, false);
  assert.equal(issued.reason, "not_eligible");
});

test("AI/ML: a forged client-supplied score cannot influence issuance", async () => {
  const { result } = await takeExam(10);
  assert.equal(result.passed, false);

  // The action's trusted inputs are (track, name) — there is no score
  // parameter to forge. Passing extra arguments that a hostile client might
  // invent must change nothing: the server reads the graded attempt row.
  const forged = await certs.issueSecureCertificate(
    "ai-ml",
    "مهاجم",
    undefined,
    { score: 40, total: 40, passed: true }
  );
  assert.equal(forged.ok, false);
  assert.equal(forged.reason, "not_eligible");

  const rows = await db
    .select()
    .from(schema.certificates)
    .where(eq(schema.certificates.userId, currentUser));
  assert.deepStrictEqual(rows, []);
});

test("AI/ML: issuing twice is idempotent — one certificate, same id", async () => {
  await takeExam(36);

  const first = await certs.issueSecureCertificate("ai-ml", "مكرّر");
  const second = await certs.issueSecureCertificate("ai-ml", "اسم مختلف تمامًا");
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.certId, first.certId, "the existing certificate is returned");

  const rows = await db
    .select()
    .from(schema.certificates)
    .where(eq(schema.certificates.userId, currentUser));
  assert.equal(rows.length, 1, "exactly one certificate per (user, track)");
  assert.equal(
    rows[0].recipientName,
    "مكرّر",
    "a second call must not overwrite the issued name"
  );
});

test("AI/ML: a name that sanitizes to nothing is refused", async () => {
  await takeExam(33);
  const issued = await certs.issueSecureCertificate("ai-ml", "\u0000\u0007   ");
  assert.equal(issued.ok, false);
  assert.equal(issued.reason, "invalid_name");
});

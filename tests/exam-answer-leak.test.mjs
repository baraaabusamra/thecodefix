import test, { mock } from "node:test";
import assert from "node:assert";
import { createTestDb, dbModuleExports, createUser } from "./helpers/pglite.mjs";
import { makeExamEligible, answerExam, EXPLANATIONS } from "./helpers/exam.mjs";

// A FAILED final exam must never disclose the answer key: no correctIndex,
// no explanation — on the first submit, on re-submits, or after expiry.
// Real exam actions + real html question bank + PGlite.

const { db } = await createTestDb();
mock.module("@/db", { exports: dbModuleExports(db) });
let currentUser = null;
mock.module("@/auth", {
  exports: { auth: async () => (currentUser ? { user: { id: currentUser, role: "student" } } : null) },
});
mock.module("@/lib/rate-limit", { exports: { rateLimit: () => true, getClientIp: async () => "t" } });

const actions = await import("../src/app/quiz/[tech]/exam-actions.ts");
const { getRequiredLessons } = await import("../src/lib/quiz-requirements.ts");

function leaksAnswerKey(result) {
  const json = JSON.stringify(result);
  return (
    json.includes("correctIndex") ||
    json.includes('"explain"') ||
    EXPLANATIONS.some((e) => json.includes(JSON.stringify(e).slice(1, -1)))
  );
}

async function takeExam(correctCount) {
  currentUser = await createUser(db);
  await makeExamEligible(db, currentUser, getRequiredLessons("html"));
  const start = await actions.startOrResumeExam("html");
  assert.equal(start.ok, true, JSON.stringify(start));
  await answerExam(db, actions, start.attemptId, start.questions, correctCount);
  return { start, result: await actions.submitExam(start.attemptId) };
}

test("a failed final exam returns score/pass-fail/which-were-wrong only", async () => {
  const { start, result } = await takeExam(10); // 10/40 < 32
  assert.equal(result.ok, true);
  assert.equal(result.passed, false);
  assert.equal(result.score, 10);
  assert.equal(leaksAnswerKey(result), false, "failed attempt leaked the answer key");
  assert.equal(result.results.length, start.questions.length);
  assert.equal(result.results.filter((r) => r.correct).length, 10);

  // Re-submitting (idempotent re-read) must not leak either.
  const again = await actions.submitExam(start.attemptId);
  assert.equal(again.passed, false);
  assert.equal(leaksAnswerKey(again), false);
});

test("the start/resume payload never contains the answer key", async () => {
  currentUser = await createUser(db);
  await makeExamEligible(db, currentUser, getRequiredLessons("html"));
  const start = await actions.startOrResumeExam("html");
  assert.equal(leaksAnswerKey(start), false);
  assert.equal(leaksAnswerKey(await actions.startOrResumeExam("html")), false); // resume
});

test("a passed final exam reveals the answer key and explanations", async () => {
  const { result } = await takeExam(35);
  assert.equal(result.passed, true);
  assert.ok(result.results.every((r) => Number.isInteger(r.correctIndex) && typeof r.explain === "string"));
});

import test, { mock } from "node:test";
import assert from "node:assert";
import { eq } from "drizzle-orm";
import { createTestDb, dbModuleExports, createUser } from "./helpers/pglite.mjs";
import { makeExamEligible, answerExam, correctShuffledIndex } from "./helpers/exam.mjs";

// Exam attempt integrity under concurrency, against a real Postgres (PGlite)
// with the real exam actions and real html question bank. Promise.all
// interleaves the actions' statements, which is exactly what exposed the old
// read-modify-write races.

const { db, schema } = await createTestDb();
mock.module("@/db", { exports: dbModuleExports(db) });
let currentUser = null;
mock.module("@/auth", {
  exports: { auth: async () => (currentUser ? { user: { id: currentUser, role: "student" } } : null) },
});
mock.module("@/lib/rate-limit", { exports: { rateLimit: () => true, getClientIp: async () => "t" } });

const actions = await import("../src/app/quiz/[tech]/exam-actions.ts");
const lessonQuiz = await import("../src/app/learn/quiz-actions.ts");
const { getRequiredLessons } = await import("../src/lib/quiz-requirements.ts");
const { isUniqueViolation } = await import("../src/lib/db-errors.ts");
const { getExamQuestionPool, grade } = await import("../src/lib/quiz-bank.ts");

async function newAttempt() {
  currentUser = await createUser(db);
  await makeExamEligible(db, currentUser, getRequiredLessons("html"));
  const start = await actions.startOrResumeExam("html");
  assert.equal(start.ok, true, JSON.stringify(start));
  return start;
}
async function row(id) {
  const [r] = await db.select().from(schema.examAttempts).where(eq(schema.examAttempts.id, id));
  return r;
}

test("saveExamAnswer refuses to write into an attempt owned by a different user", async () => {
  const start = await newAttempt();
  const victim = currentUser;
  currentUser = await createUser(db);
  const res = await actions.saveExamAnswer(start.attemptId, start.questions[0].id, 1);
  assert.deepStrictEqual(res, { ok: false, reason: "not_found" });
  assert.equal((await row(start.attemptId)).answers, "{}");
  assert.equal((await row(start.attemptId)).userId, victim);
});

test("saveExamAnswer rejects writes to an attempt past its server-enforced expiresAt, regardless of client-claimed time", async () => {
  const start = await newAttempt();
  await db
    .update(schema.examAttempts)
    .set({ expiresAt: new Date(Date.now() - 1000) })
    .where(eq(schema.examAttempts.id, start.attemptId));
  const res = await actions.saveExamAnswer(start.attemptId, start.questions[0].id, 1);
  assert.deepStrictEqual(res, { ok: false, reason: "expired" });
  const r = await row(start.attemptId);
  assert.equal(r.answers, "{}");
  assert.equal(r.status, "graded", "an expired attempt is finalized, not left in progress");
});

test("answers for questions outside the attempt are refused", async () => {
  const start = await newAttempt();
  const res = await actions.saveExamAnswer(start.attemptId, "html-exam-not-in-this-attempt", 1);
  assert.deepStrictEqual(res, { ok: false, reason: "not_found" });
  assert.equal((await row(start.attemptId)).answers, "{}");
});

test("concurrent autosaves never lose answers (no read-modify-write)", async () => {
  const start = await newAttempt();
  const results = await Promise.all(
    start.questions.map((q, i) => actions.saveExamAnswer(start.attemptId, q.id, i % 4))
  );
  assert.ok(results.every((r) => r.ok));
  const stored = JSON.parse((await row(start.attemptId)).answers);
  assert.equal(Object.keys(stored).length, start.questions.length);
});

test("submitted attempts are immutable: autosave after submit fails safely", async () => {
  const start = await newAttempt();
  await answerExam(db, actions, start.attemptId, start.questions, 20);
  const submitted = await actions.submitExam(start.attemptId);
  const before = await row(start.attemptId);

  const late = await actions.saveExamAnswer(start.attemptId, start.questions[25].id,
    await correctShuffledIndex(db, start.attemptId, start.questions[25].id));
  assert.deepStrictEqual(late, { ok: false, reason: "expired" });
  const after = await row(start.attemptId);
  assert.equal(after.answers, before.answers);
  assert.equal(after.score, submitted.score);
});

test("concurrent submits produce exactly one grading outcome", async () => {
  const start = await newAttempt();
  await answerExam(db, actions, start.attemptId, start.questions, 33);
  const results = await Promise.all(Array.from({ length: 6 }, () => actions.submitExam(start.attemptId)));
  assert.ok(results.every((r) => r.ok && r.score === 33 && r.passed === true));
  const r = await row(start.attemptId);
  assert.equal(r.status, "graded");
  assert.equal(r.score, 33);
});

test("autosaves racing a submit can't change the stored grade", async () => {
  const start = await newAttempt();
  await answerExam(db, actions, start.attemptId, start.questions.slice(0, 20), 20);
  // Fire the submit together with autosaves for the remaining questions.
  const rest = start.questions.slice(20);
  const [submitted] = await Promise.all([
    actions.submitExam(start.attemptId),
    ...rest.map(async (q) =>
      actions.saveExamAnswer(start.attemptId, q.id, await correctShuffledIndex(db, start.attemptId, q.id))
    ),
  ]);
  const r = await row(start.attemptId);
  // The stored score must equal a re-grade of the stored (frozen) answers.
  const regrade = grade(
    getExamQuestionPool("html"),
    JSON.parse(r.questionIds),
    JSON.parse(r.optionOrder),
    JSON.parse(r.answers)
  );
  assert.equal(r.score, regrade.score);
  assert.equal(submitted.score, r.score);
});

test("a submitted-but-ungraded attempt (e.g. crash mid-submit) is finalized, not resumed", async () => {
  const start = await newAttempt();
  await db
    .update(schema.examAttempts)
    .set({ submittedAt: new Date() })
    .where(eq(schema.examAttempts.id, start.attemptId));
  const again = await actions.startOrResumeExam("html");
  assert.equal(again.ok, true);
  assert.notEqual(again.attemptId, start.attemptId, "must not resume a frozen attempt");
  assert.equal((await row(start.attemptId)).status, "graded");
});

test("concurrent exam starts converge on ONE in-progress attempt (unique index + conflict fallback)", async () => {
  currentUser = await createUser(db);
  await makeExamEligible(db, currentUser, getRequiredLessons("html"));
  const starts = await Promise.all(Array.from({ length: 5 }, () => actions.startOrResumeExam("html")));
  assert.ok(starts.every((s) => s.ok), JSON.stringify(starts.find((s) => !s.ok)));
  assert.equal(new Set(starts.map((s) => s.attemptId)).size, 1);
  const inProgress = await db
    .select()
    .from(schema.examAttempts)
    .where(eq(schema.examAttempts.userId, currentUser));
  assert.equal(inProgress.filter((r) => r.status === "in_progress").length, 1);
});

test("the unique-violation detector sees through drizzle's error wrapping", async () => {
  const userId = await createUser(db);
  const values = { userId, track: "html", questionIds: "[]", optionOrder: "{}", expiresAt: new Date(Date.now() + 60_000) };
  await db.insert(schema.examAttempts).values(values);
  const error = await db.insert(schema.examAttempts).values(values).then(() => null, (e) => e);
  assert.ok(error);
  assert.notEqual(error.name, "NeonDbError"); // why the old check never matched
  assert.equal(isUniqueViolation(error, "exam_attempt_one_in_progress_per_track"), true);
  assert.equal(isUniqueViolation(error, "some_other_constraint"), false);
});

test("lesson quiz: concurrent/replayed submits can't overwrite a stored grade", async () => {
  currentUser = await createUser(db);
  const start = await lessonQuiz.startLessonQuiz("html", "00-intro");
  assert.equal(start.ok, true, JSON.stringify(start));
  const results = await Promise.all([
    lessonQuiz.submitLessonQuiz(start.attemptId, {}),
    lessonQuiz.submitLessonQuiz(start.attemptId, Object.fromEntries(start.questions.map((q) => [q.id, 0]))),
  ]);
  assert.equal(results.filter((r) => r.ok).length, 1);
  assert.equal(results.filter((r) => !r.ok && r.reason === "already_graded").length, 1);
});

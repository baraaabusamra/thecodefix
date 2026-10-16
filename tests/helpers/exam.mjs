// Helpers for driving the REAL server-graded exam flow in tests (real
// quiz-bank, real exam actions, PGlite database).

import fs from "node:fs";
import { eq } from "drizzle-orm";
import * as schema from "../../packages/db/src/schema.ts";

const BANK = JSON.parse(fs.readFileSync("content/ar/quiz-bank/html/exam.json", "utf8")).questions;
const ANSWER = new Map(BANK.map((q) => [q.id, q]));

/** Makes a user eligible for the html final exam (all required lesson quizzes passed). */
export async function makeExamEligible(db, userId, requiredLessons) {
  if (requiredLessons.length === 0) return;
  await db.insert(schema.lessonQuizAttempts).values(
    requiredLessons.map((lessonSlug) => ({
      userId,
      track: "html",
      lessonSlug,
      questionIds: "[]",
      optionOrder: "{}",
      status: "graded",
      score: 5,
      total: 5,
      passed: true,
      submittedAt: new Date(),
    }))
  );
}

/** The index (in the SHUFFLED options the learner saw) of the right answer. */
export async function correctShuffledIndex(db, attemptId, questionId) {
  const [row] = await db
    .select({ optionOrder: schema.examAttempts.optionOrder })
    .from(schema.examAttempts)
    .where(eq(schema.examAttempts.id, attemptId));
  const order = JSON.parse(row.optionOrder)[questionId];
  return order.indexOf(ANSWER.get(questionId).answer);
}

/** Answers `correctCount` questions right and the rest wrong, via saveExamAnswer. */
export async function answerExam(db, actions, attemptId, questions, correctCount) {
  for (const [i, q] of questions.entries()) {
    const right = await correctShuffledIndex(db, attemptId, q.id);
    const choice = i < correctCount ? right : (right + 1) % q.options.length;
    const res = await actions.saveExamAnswer(attemptId, q.id, choice);
    if (!res.ok) throw new Error(`saveExamAnswer failed: ${res.reason}`);
  }
}

export const EXPLANATIONS = BANK.map((q) => q.explain);

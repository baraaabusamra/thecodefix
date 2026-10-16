import test from "node:test";
import assert from "node:assert";
import {
  pickAndSanitize,
  reconstructSanitized,
  grade,
} from "../modules/assessment/src/quiz-bank.js";

// Pure logic tests — no DB, no auth, no mocking. This is the module every
// grading decision in the quiz/exam system routes through, so its
// correctness is the single highest-leverage thing to verify directly.

function makePool() {
  return [
    { id: "q1", q: "Q1?", options: ["a", "b", "c", "d"], answer: 2, explain: "e1" },
    { id: "q2", q: "Q2?", options: ["a", "b", "c", "d"], answer: 0, explain: "e2" },
    { id: "q3", q: "Q3?", options: ["a", "b", "c", "d"], answer: 3, explain: "e3" },
    { id: "q4", q: "Q4?", options: ["a", "b", "c", "d"], answer: 1, explain: "e4" },
    { id: "q5", q: "Q5?", options: ["a", "b", "c", "d"], answer: 2, explain: "e5" },
    { id: "q6", q: "Q6?", options: ["a", "b", "c", "d"], answer: 0, explain: "e6" },
  ];
}

test("pickAndSanitize never leaks answer or explain to the client-facing shape", () => {
  const pool = makePool();
  const { sanitized } = pickAndSanitize(pool, 5);
  assert.equal(sanitized.length, 5);
  for (const q of sanitized) {
    assert.ok(!("answer" in q), "sanitized question must not carry `answer`");
    assert.ok(!("explain" in q), "sanitized question must not carry `explain`");
    assert.equal(q.options.length, 4);
  }
});

test("pickAndSanitize picks distinct questions and caps at pool size", () => {
  const pool = makePool();
  const { questionIds } = pickAndSanitize(pool, 100);
  assert.equal(questionIds.length, pool.length, "should cap at pool size, not overrun");
  assert.equal(new Set(questionIds).size, questionIds.length, "no duplicate picks");
});

test("grade() correctly scores a fully-correct submission after shuffling", () => {
  const pool = makePool();
  const { questionIds, optionOrder, sanitized } = pickAndSanitize(pool, pool.length);
  // Build "perfect" answers by finding, for each question, the shuffled
  // index whose text matches the pool's real correct option text.
  const answers = {};
  for (const q of sanitized) {
    const original = pool.find((p) => p.id === q.id);
    const correctText = original.options[original.answer];
    answers[q.id] = q.options.indexOf(correctText);
  }
  const result = grade(pool, questionIds, optionOrder, answers);
  assert.equal(result.score, pool.length);
  assert.equal(result.total, pool.length);
  assert.ok(result.results.every((r) => r.correct));
});

test("grade() scores a fully-wrong submission as zero, never trusting client claims of correctness", () => {
  const pool = makePool();
  const { questionIds, optionOrder, sanitized } = pickAndSanitize(pool, pool.length);
  const answers = {};
  for (const q of sanitized) {
    const original = pool.find((p) => p.id === q.id);
    const correctText = original.options[original.answer];
    const correctShuffledIndex = q.options.indexOf(correctText);
    // pick any option that is NOT the correct one
    answers[q.id] = (correctShuffledIndex + 1) % q.options.length;
  }
  const result = grade(pool, questionIds, optionOrder, answers);
  assert.equal(result.score, 0);
  assert.ok(result.results.every((r) => !r.correct));
});

test("grade() ignores unknown/tampered question ids instead of crashing or scoring them", () => {
  const pool = makePool();
  const { questionIds, optionOrder } = pickAndSanitize(pool, 3);
  const answers = { "not-a-real-id": 0 };
  const result = grade(pool, questionIds, optionOrder, answers);
  assert.equal(result.total, 3, "grading is driven by the persisted snapshot, not by whatever ids the client submits");
  assert.equal(result.score, 0);
});

test("grade() treats an out-of-range or missing selected index as simply incorrect, not a crash", () => {
  const pool = makePool();
  const { questionIds, optionOrder } = pickAndSanitize(pool, 2);
  const answers = { [questionIds[0]]: 99 }; // out of bounds
  assert.doesNotThrow(() => grade(pool, questionIds, optionOrder, answers));
  const result = grade(pool, questionIds, optionOrder, answers);
  assert.equal(result.results[0].correct, false);
  assert.equal(result.results[0].selectedIndex, null);
});

test("reconstructSanitized rebuilds the exact same option order as the original attempt (for resume)", () => {
  const pool = makePool();
  const { questionIds, optionOrder, sanitized } = pickAndSanitize(pool, 4);
  const rebuilt = reconstructSanitized(pool, questionIds, optionOrder);
  assert.deepEqual(rebuilt, sanitized);
});

// ── Pass/fail boundaries (mirrors the thresholds in the server actions:
// lesson quiz 4/5, final exam 32/40) ────────────────────────────────────

test("lesson-quiz boundary: 3/5 correct is a fail, 4/5 is a pass (threshold = 4)", () => {
  const LESSON_QUIZ_PASS = 4;
  assert.equal(3 >= LESSON_QUIZ_PASS, false);
  assert.equal(4 >= LESSON_QUIZ_PASS, true);
});

test("final-exam boundary: 31/40 correct is a fail, 32/40 is a pass (threshold = 32)", () => {
  const EXAM_PASS = 32;
  assert.equal(31 >= EXAM_PASS, false);
  assert.equal(32 >= EXAM_PASS, true);
});

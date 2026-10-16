import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

// Structural guarantees for the AI/ML secure exam bank.
//
// The production exam draws 40 questions from this pool, so a malformed
// entry is not a cosmetic problem: an out-of-range `answer` silently makes a
// question ungradeable, a duplicated option makes it unanswerable, and a
// duplicated id would collide in the attempt snapshot that grading replays.
// None of that is caught by typecheck — the bank is plain JSON.

const BANK_PATH = path.join(
  process.cwd(),
  "content", "ar", "quiz-bank", "ai-ml", "exam.json"
);

const EXAM_QUESTIONS_PER_ATTEMPT = 40;
const POOL_SIZE = 90;

test("the AI/ML exam bank exists and parses as JSON", () => {
  assert.ok(fs.existsSync(BANK_PATH), `missing bank at ${BANK_PATH}`);
  const raw = fs.readFileSync(BANK_PATH, "utf8");
  assert.doesNotThrow(() => JSON.parse(raw), "bank is not valid JSON");
});

const bank = JSON.parse(fs.readFileSync(BANK_PATH, "utf8"));
const questions = bank.questions;

test("the bank holds exactly 90 questions in a `questions` array", () => {
  assert.ok(Array.isArray(questions), "expected a top-level `questions` array");
  assert.equal(questions.length, POOL_SIZE);
  assert.ok(
    questions.length > EXAM_QUESTIONS_PER_ATTEMPT,
    "the pool must be larger than one attempt, or every attempt is identical"
  );
});

test("every question matches the BankQuestion shape exactly", () => {
  const problems = [];
  for (const [i, q] of questions.entries()) {
    const where = q?.id ?? `index ${i}`;
    const keys = Object.keys(q).sort().join(",");
    if (keys !== "answer,explain,id,options,q") {
      problems.push(`${where}: unexpected keys (${keys})`);
    }
    if (typeof q.id !== "string" || !q.id.trim()) {
      problems.push(`${where}: id must be a non-empty string`);
    }
    if (typeof q.q !== "string" || !q.q.trim()) {
      problems.push(`${where}: q must be a non-empty string`);
    }
    if (typeof q.explain !== "string" || !q.explain.trim()) {
      problems.push(`${where}: explain must be non-empty`);
    }
  }
  assert.deepStrictEqual(problems, []);
});

test("ids are unique — grading replays an attempt by id", () => {
  const seen = new Map();
  const dupes = [];
  for (const q of questions) {
    if (seen.has(q.id)) dupes.push(q.id);
    seen.set(q.id, true);
  }
  assert.deepStrictEqual(dupes, []);
  assert.equal(seen.size, POOL_SIZE);
});

test("no two questions share the same text", () => {
  const seen = new Set();
  const dupes = [];
  for (const q of questions) {
    const key = q.q.replace(/\s+/g, " ").trim();
    if (seen.has(key)) dupes.push(q.id);
    seen.add(key);
  }
  assert.deepStrictEqual(
    dupes,
    [],
    "a duplicated question can be drawn twice into one attempt"
  );
});

test("every question has exactly four distinct, non-empty options", () => {
  const problems = [];
  for (const q of questions) {
    if (!Array.isArray(q.options) || q.options.length !== 4) {
      problems.push(`${q.id}: expected 4 options, got ${q.options?.length}`);
      continue;
    }
    if (q.options.some((o) => typeof o !== "string" || !o.trim())) {
      problems.push(`${q.id}: has an empty option`);
    }
    const distinct = new Set(q.options.map((o) => o.replace(/\s+/g, " ").trim()));
    if (distinct.size !== 4) {
      problems.push(`${q.id}: duplicated options`);
    }
  }
  assert.deepStrictEqual(problems, []);
});

test("every `answer` is an integer index into its own options array", () => {
  const problems = [];
  for (const q of questions) {
    if (!Number.isInteger(q.answer)) {
      problems.push(`${q.id}: answer is not an integer`);
    } else if (q.answer < 0 || q.answer >= q.options.length) {
      problems.push(`${q.id}: answer ${q.answer} is out of range`);
    }
  }
  assert.deepStrictEqual(problems, []);
});

test("the correct answer is spread across all four positions", () => {
  const dist = [0, 0, 0, 0];
  for (const q of questions) dist[q.answer]++;

  // Options are reshuffled per attempt, so this is not a security property —
  // it is a defence against the bank becoming trivially guessable if any
  // future code path ever served it unshuffled.
  const expected = POOL_SIZE / 4;
  for (const [index, count] of dist.entries()) {
    assert.ok(
      Math.abs(count - expected) <= 1,
      `index ${index} holds ${count} answers; expected within 1 of ${expected} (distribution: ${dist})`
    );
  }
  assert.equal(
    dist.reduce((a, b) => a + b, 0),
    POOL_SIZE
  );
});

test("question ids are namespaced to this track", () => {
  const stray = questions
    .filter((q) => !q.id.startsWith("ai-ml-exam-"))
    .map((q) => q.id);
  assert.deepStrictEqual(
    stray,
    [],
    "ids are stored in attempt snapshots; a collision with another track's bank would be silent"
  );
});

test("AI/ML ships NO legacy client-graded quiz file", () => {
  const legacy = path.join(
    process.cwd(),
    "content", "ar", "quizzes", "ai-ml.json"
  );
  assert.ok(
    !fs.existsSync(legacy),
    "src/content/quizzes/ai-ml.json would ship the answer key to the browser " +
      "and route /quiz/ai-ml to the legacy client-graded runner, which cannot " +
      "back a verified certificate"
  );
});

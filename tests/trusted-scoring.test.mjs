import test, { mock } from "node:test";
import assert from "node:assert";
import { createTestDb, dbModuleExports, createUser } from "./helpers/pglite.mjs";

// Points, ranking and achievement counts come ONLY from server-owned records
// (lesson_completion + passed server-graded exam attempts). A client that
// reports any score gains nothing. Real actions + real leaderboard + PGlite.

const { db, schema } = await createTestDb();
mock.module("@tcf/db", { exports: dbModuleExports(db) });

let currentUser = null;
mock.module("@tcf/identity/auth", {
  exports: { auth: async () => (currentUser ? { user: { id: currentUser } } : null) },
});
mock.module("@tcf/content/tracks", {
  exports: {
    getTracks: async () => [{ slug: "python" }, { slug: "html" }],
    getLessons: async (t) => (t === "python" ? [{ slug: "01-intro" }, { slug: "02-vars" }] : [{ slug: "00-intro" }]),
  },
});
mock.module("@tcf/content/quizzes", { exports: { getQuiz: () => ({ questions: new Array(10).fill({}) }) } });
mock.module("@tcf/core/rate-limit", { exports: { rateLimit: () => true, getClientIp: async () => "t" } });

const actions = await import("../modules/progress/src/actions/progress.ts");
const { getLeaderboard } = await import("../modules/progress/src/leaderboard.ts");
const { LESSON_POINTS, QUIZ_POINTS } = await import("../modules/progress/src/points.ts");

async function examAttempt(userId, { status = "graded", passed = true, score = 35, track = "html" } = {}) {
  await db.insert(schema.examAttempts).values({
    userId,
    track,
    questionIds: "[]",
    optionOrder: "{}",
    status,
    score: status === "graded" ? score : null,
    total: 40,
    passed: status === "graded" ? passed : null,
    expiresAt: new Date(Date.now() + 60_000),
    submittedAt: status === "graded" ? new Date() : null,
  });
}
async function boardPoints(userId) {
  const board = await getLeaderboard(100);
  return board.allTime.find((r) => r.userId === userId)?.game.points ?? 0;
}

test("a malicious client reporting score=999999 gains no points", async () => {
  currentUser = await createUser(db);
  await actions.saveMyProgress({
    name: "",
    completedLessons: { python: ["01-intro"] },
    quizzes: {
      python: { score: 999999, total: 10, passedAt: "2026-01-01" },
      html: { score: 10, total: 10, passedAt: "2026-01-01" },
    },
  });
  assert.equal(await boardPoints(currentUser), 1 * LESSON_POINTS);
  const stats = await actions.getMyStats();
  assert.equal(stats.quizzesPassed, 0);
  assert.deepStrictEqual((await actions.getMyProgress()).quizzes, {});
});

test("scores stored in the legacy progress JSON are never counted", async () => {
  const userId = await createUser(db);
  await db.insert(schema.userProgress).values({
    userId,
    name: "",
    data: JSON.stringify({ completedLessons: {}, quizzes: { python: { score: 999999, total: 10 } } }),
  });
  currentUser = userId;
  assert.equal((await actions.getMyStats()).quizzesPassed, 0);
  assert.equal(await boardPoints(userId), 0);
});

test("only a PASSED, server-graded exam attempt counts as a quiz pass", async () => {
  const userId = await createUser(db);
  await examAttempt(userId, { passed: false, score: 10 });
  await examAttempt(userId, { status: "in_progress" });
  currentUser = userId;
  assert.equal((await actions.getMyStats()).quizzesPassed, 0);

  await examAttempt(userId, { passed: true, score: 35 });
  await examAttempt(userId, { passed: true, score: 38 }); // same track: counted once
  assert.equal((await actions.getMyStats()).quizzesPassed, 1);
  assert.equal(await boardPoints(userId), QUIZ_POINTS);
  assert.deepStrictEqual(
    Object.fromEntries(Object.entries((await actions.getMyProgress()).quizzes).map(([k, v]) => [k, v.score])),
    { html: 38 }
  );
});

test("leaderboard ranks by trusted points only", async () => {
  const honest = await createUser(db, { name: "Honest" });
  const cheater = await createUser(db, { name: "Cheater" });
  currentUser = honest;
  await actions.completeLesson("python", "01-intro");
  await actions.completeLesson("python", "02-vars");
  currentUser = cheater;
  await actions.saveMyProgress({
    name: "",
    completedLessons: { python: Array(400).fill("01-intro") },
    quizzes: { python: { score: 10, total: 10, passedAt: "2026-01-01" } },
  });
  const board = await getLeaderboard(100);
  const rank = (id) => board.allTime.findIndex((r) => r.userId === id);
  assert.ok(rank(honest) < rank(cheater), "the honest learner must outrank the cheater");
  assert.equal(board.allTime[rank(cheater)].game.points, LESSON_POINTS);
});

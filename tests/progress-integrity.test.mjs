import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import {
  sanitizeProgressInput,
  MAX_LESSON_ENTRIES_PER_TRACK,
} from "../modules/progress/src/sanitize.ts";
import { computeGamification, LESSON_POINTS, QUIZ_POINTS } from "../modules/progress/src/points.ts";

// Phase 0: client-submitted progress can't inflate points/leaderboard rank.

const content = {
  trackSlugs: new Set(["python", "html"]),
  lessonsFor: (t) =>
    t === "python" ? new Set(["01-intro", "02-vars", "03-loops"]) : new Set(["00-intro"]),
  quizLength: (t) => (t === "python" ? 10 : null),
};
const NOW = new Date("2026-09-18T12:00:00.000Z");
const clean = (p) => sanitizeProgressInput(p, content, NOW);
const points = (p) => computeGamification(p).points;

test("duplicate lesson slugs count once", async () => {
  const out = await clean({
    completedLessons: { python: Array(400).fill("01-intro").concat(["02-vars", "02-vars"]) },
  });
  assert.deepStrictEqual(out.completedLessons, { python: ["01-intro", "02-vars"] });
  assert.equal(points(out), 2 * LESSON_POINTS);
});

test("unknown lessons and unknown tracks are dropped", async () => {
  const out = await clean({
    completedLessons: { python: ["01-intro", "99-fake", 42, null], rust: ["01-intro"], __proto__: ["x"] },
  });
  assert.deepStrictEqual(out.completedLessons, { python: ["01-intro"] });
});

test("extremely large arrays are bounded (only the first entries are examined)", async () => {
  const huge = Array(MAX_LESSON_ENTRIES_PER_TRACK).fill("nope").concat(["01-intro"]);
  const out = await clean({ completedLessons: { python: huge } });
  assert.deepStrictEqual(out.completedLessons, {});
});

test("impossible quiz results are dropped: negative, > total, wrong total, fractional, NaN", async () => {
  for (const r of [
    { score: -1, total: 10 },
    { score: 11, total: 10 },
    { score: 10, total: 11 },
    { score: 5, total: 5 },
    { score: 9.5, total: 10 },
    { score: "x", total: 10 },
    { score: 10, total: Infinity },
  ]) {
    const out = await clean({ quizzes: { python: { ...r, passedAt: "2026-01-01T00:00:00Z" } } });
    assert.deepStrictEqual(out.quizzes, {}, JSON.stringify(r));
  }
});

test("quiz for a track without a quiz (or unknown track) is dropped", async () => {
  const out = await clean({
    quizzes: { html: { score: 1, total: 1 }, rust: { score: 1, total: 1 } },
  });
  assert.deepStrictEqual(out.quizzes, {});
});

test("a valid quiz result is kept; passedAt is normalized (no future/garbage dates)", async () => {
  const ok = await clean({ quizzes: { python: { score: 8, total: 10, passedAt: "2026-05-01T10:00:00Z" } } });
  assert.deepStrictEqual(ok.quizzes.python, { score: 8, total: 10, passedAt: "2026-05-01T10:00:00.000Z" });
  const future = await clean({ quizzes: { python: { score: 8, total: 10, passedAt: "2999-01-01" } } });
  assert.equal(future.quizzes.python.passedAt, NOW.toISOString());
  const junk = await clean({ quizzes: { python: { score: 8, total: 10, passedAt: { x: 1 } } } });
  assert.equal(junk.quizzes.python.passedAt, NOW.toISOString());
});

test("hostile top-level shapes don't throw and yield empty progress", async () => {
  for (const p of [null, undefined, 42, "x", [], { completedLessons: "x", quizzes: [] }]) {
    const out = await clean(p);
    assert.deepStrictEqual(out, { name: "", completedLessons: {}, quizzes: {} });
  }
});

test("name is capped", async () => {
  assert.equal((await clean({ name: "a".repeat(5000) })).name.length, 100);
});

test("points: rows already stored with duplicates (pre-fix) no longer inflate the leaderboard", () => {
  const stored = {
    name: "",
    completedLessons: { python: Array(10_000).fill("01-intro") },
    quizzes: {
      python: { score: 10, total: 10, passedAt: "" },
      html: { score: 99, total: 1, passedAt: "" }, // impossible, stored earlier
      css: { score: 1, total: 0, passedAt: "" },
    },
  };
  assert.equal(points(stored), LESSON_POINTS + QUIZ_POINTS);
});

test("wiring: client progress is only persisted through the sanitizer", () => {
  const src = fs.readFileSync("modules/progress/src/actions/progress.ts", "utf8");
  // The only bulk write of client-supplied lessons goes through the sanitizer.
  const importFn = src.slice(src.indexOf("async function importCompletions"));
  assert.ok(importFn.indexOf("sanitizeProgressInput(") >= 0);
  assert.ok(importFn.indexOf("sanitizeProgressInput(") < importFn.indexOf(".insert(lessonCompletions)"));
  const save = src.slice(src.indexOf("export async function saveMyProgress"));
  assert.match(save.slice(0, save.indexOf("\n}\n")), /await importCompletions\(userId, p\)/);
  // No client-supplied progress JSON is written as trusted state anymore.
  assert.doesNotMatch(src, /data:\s*JSON\.stringify/);
});

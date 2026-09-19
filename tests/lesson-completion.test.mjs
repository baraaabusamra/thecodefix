import test, { mock } from "node:test";
import assert from "node:assert";
import { createTestDb, dbModuleExports, createUser } from "./helpers/pglite.mjs";

// Server-owned lesson completion, exercised through the real Server Actions
// against a real Postgres (PGlite) with the committed migrations.

const { db, schema } = await createTestDb();
mock.module("@/db", { exports: dbModuleExports(db) });

let currentUser = null;
mock.module("@/auth", {
  exports: { auth: async () => (currentUser ? { user: { id: currentUser } } : null) },
});
mock.module("@/lib/content", {
  exports: {
    getTracks: async () => [{ slug: "python" }, { slug: "html" }],
    getLessons: async (track) =>
      track === "python"
        ? [{ slug: "01-intro" }, { slug: "02-vars" }, { slug: "03-loops" }]
        : track === "html"
          ? [{ slug: "00-intro" }]
          : [],
  },
});
mock.module("@/lib/quiz", { exports: { getQuiz: () => ({ questions: new Array(10).fill({}) }) } });
mock.module("@/lib/rate-limit", { exports: { rateLimit: () => true, getClientIp: async () => "t" } });

const actions = await import("../src/app/progress-actions.ts");
const { eq } = await import("drizzle-orm");

async function completionsOf(userId) {
  const rows = await db
    .select()
    .from(schema.lessonCompletions)
    .where(eq(schema.lessonCompletions.userId, userId));
  return rows.map((r) => `${r.track}/${r.lessonSlug}`).sort();
}

test("anonymous callers can't write anything", async () => {
  currentUser = null;
  assert.deepStrictEqual(await actions.completeLesson("python", "01-intro"), {
    ok: false,
    reason: "unauthenticated",
  });
  assert.equal(await actions.getMyProgress(), null);
});

test("repeated completion is idempotent (one row)", async () => {
  currentUser = await createUser(db);
  for (let i = 0; i < 5; i++) {
    assert.deepStrictEqual(await actions.completeLesson("python", "01-intro"), { ok: true });
  }
  assert.deepStrictEqual(await completionsOf(currentUser), ["python/01-intro"]);
});

test("invalid lesson and invalid track are refused and write nothing", async () => {
  currentUser = await createUser(db);
  assert.equal((await actions.completeLesson("python", "99-fake")).reason, "invalid");
  assert.equal((await actions.completeLesson("rust", "01-intro")).reason, "invalid");
  assert.equal((await actions.completeLesson("python", { toString: () => "01-intro" })).reason, "invalid");
  assert.deepStrictEqual(await completionsOf(currentUser), []);
});

test("users can't see or remove another user's completions", async () => {
  const alice = await createUser(db);
  const bob = await createUser(db);
  currentUser = alice;
  await actions.completeLesson("python", "02-vars");
  currentUser = bob;
  assert.deepStrictEqual((await actions.getMyProgress()).completedLessons, {});
  await actions.uncompleteLesson("python", "02-vars"); // bob's own (non-existent) row only
  assert.deepStrictEqual(await completionsOf(alice), ["python/02-vars"]);
});

test("uncomplete removes only the caller's own row", async () => {
  currentUser = await createUser(db);
  await actions.completeLesson("python", "01-intro");
  await actions.completeLesson("python", "02-vars");
  await actions.uncompleteLesson("python", "01-intro");
  assert.deepStrictEqual(await completionsOf(currentUser), ["python/02-vars"]);
});

test("guest sync: validated, additive, never deletes server progress, ignores quiz scores", async () => {
  currentUser = await createUser(db);
  await actions.completeLesson("html", "00-intro"); // already on the server
  await actions.saveMyProgress({
    name: "Learner",
    completedLessons: {
      python: ["01-intro", "01-intro", "99-fake"],
      rust: ["01-intro"],
    },
    quizzes: { python: { score: 999999, total: 10, passedAt: "2026-01-01" } },
  });
  assert.deepStrictEqual(await completionsOf(currentUser), ["html/00-intro", "python/01-intro"]);
  const mine = await actions.getMyProgress();
  assert.equal(mine.name, "Learner");
  assert.deepStrictEqual(mine.quizzes, {}); // browser scores are never server state
});

test("concurrent completion requests converge on one row", async () => {
  currentUser = await createUser(db);
  const results = await Promise.all(
    Array.from({ length: 20 }, () => actions.completeLesson("python", "03-loops"))
  );
  assert.ok(results.every((r) => r.ok));
  assert.deepStrictEqual(await completionsOf(currentUser), ["python/03-loops"]);
});

test("legacy server-side progress JSON is imported once (validated)", async () => {
  const userId = await createUser(db);
  await db.insert(schema.userProgress).values({
    userId,
    name: "Old",
    data: JSON.stringify({ completedLessons: { python: ["01-intro", "nope"] }, quizzes: {} }),
  });
  currentUser = userId;
  const first = await actions.getMyProgress();
  assert.deepStrictEqual(first.completedLessons, { python: ["01-intro"] });
  // Marked imported: un-completing afterwards is not undone by a re-import.
  await actions.uncompleteLesson("python", "01-intro");
  assert.deepStrictEqual((await actions.getMyProgress()).completedLessons, {});
});

test("the database itself forbids duplicate completions", async () => {
  const userId = await createUser(db);
  const row = { userId, track: "python", lessonSlug: "01-intro" };
  await db.insert(schema.lessonCompletions).values(row);
  await assert.rejects(db.insert(schema.lessonCompletions).values(row));
});

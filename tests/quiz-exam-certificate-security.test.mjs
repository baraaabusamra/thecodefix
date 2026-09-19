import test from "node:test";
import assert from "node:assert";
import { mock } from "node:test";

// Security-focused tests for the server-graded lesson-quiz / exam /
// certificate system. Mirrors the mocking style used elsewhere in this repo
// (tests/pipeline-review-actions-auth.test.mjs): fake `db`/`auth` modules,
// no real database or network I/O. Each test controls exactly the db
// responses its scenario needs and asserts on the resulting decision.

const FIXTURE_POOL = [
  { id: "q1", q: "Q1?", options: ["a", "b", "c", "d"], answer: 1, explain: "e1" },
  { id: "q2", q: "Q2?", options: ["a", "b", "c", "d"], answer: 0, explain: "e2" },
  { id: "q3", q: "Q3?", options: ["a", "b", "c", "d"], answer: 2, explain: "e3" },
  { id: "q4", q: "Q4?", options: ["a", "b", "c", "d"], answer: 3, explain: "e4" },
  { id: "q5", q: "Q5?", options: ["a", "b", "c", "d"], answer: 1, explain: "e5" },
  { id: "q6", q: "Q6?", options: ["a", "b", "c", "d"], answer: 0, explain: "e6" },
];

function fixturePickAndSanitize(pool, count) {
  const picked = pool.slice(0, Math.min(count, pool.length));
  const optionOrder = Object.fromEntries(
    picked.map((question) => [question.id, question.options.map((_, index) => index)])
  );
  return {
    questionIds: picked.map((question) => question.id),
    optionOrder,
    sanitized: picked.map(({ id, q, options }) => ({ id, q, options })),
  };
}

function fixtureReconstructSanitized(pool, questionIds, optionOrder) {
  return questionIds.flatMap((id) => {
    const question = pool.find((candidate) => candidate.id === id);
    const order = optionOrder[id];
    if (!question || !order) return [];
    return [{ id, q: question.q, options: order.map((index) => question.options[index]) }];
  });
}

function fixtureGrade(pool, questionIds, optionOrder, answers) {
  const results = [];
  let score = 0;
  for (const id of questionIds) {
    const question = pool.find((candidate) => candidate.id === id);
    const order = optionOrder[id];
    if (!question || !order) continue;
    const selectedIndex = Number.isInteger(answers[id]) ? answers[id] : null;
    const correctIndex = order.indexOf(question.answer);
    const correct = selectedIndex === correctIndex;
    if (correct) score++;
    results.push({
      id,
      q: question.q,
      options: order.map((index) => question.options[index]),
      selectedIndex,
      correctIndex,
      correct,
      explain: question.explain,
    });
  }
  return { score, total: questionIds.length, results };
}

mock.module("@/lib/quiz-bank", {
  exports: {
    getLessonQuestionPool: () => FIXTURE_POOL,
    getExamQuestionPool: () => FIXTURE_POOL,
    hasLessonQuizBank: () => true,
    hasExamBank: () => true,
    pickAndSanitize: fixturePickAndSanitize,
    reconstructSanitized: fixtureReconstructSanitized,
    grade: fixtureGrade,
  },
});

// Mirrors the real EXAM_PREREQUISITES shape with a one-lesson fixture so
// these tests stay fast. The important property is preserved: an
// unconfigured track resolves to null, so the runtime must fail closed on
// it rather than treating "no required lessons" as "no prerequisites".
const FIXTURE_PREREQUISITES = {
  html: { mode: "lesson_quizzes", requiredLessons: ["00-intro"] },
  "ai-ml": { mode: "final_exam_only" },
};

mock.module("@/lib/quiz-requirements", {
  exports: {
    EXAM_PREREQUISITES: FIXTURE_PREREQUISITES,
    REQUIRED_LESSONS_VERSION: 2,
    getExamPrerequisitePolicy: (track) => FIXTURE_PREREQUISITES[track] ?? null,
    getRequiredLessons: (track) => {
      const p = FIXTURE_PREREQUISITES[track];
      return p && p.mode === "lesson_quizzes" ? [...p.requiredLessons] : [];
    },
    isRequiredLesson: (track, slug) => track === "html" && slug === "00-intro",
  },
});

mock.module("@/lib/content", {
  exports: {
    getTrack: async (track) =>
      track === "html" ? { slug: "html", title: "HTML" } : null,
  },
});

mock.module("@/lib/rate-limit", {
  exports: { rateLimit: () => true, getClientIp: async () => "test" },
});

let authMock = async () => null;
mock.module("@/auth", { exports: { auth: (...a) => authMock(...a) } });

// A queue-based fake: each test pushes the exact sequence of responses it
// expects its scenario to need, in call order. Deliberately not a generic
// SQL-aware mock (drizzle's `eq`/`and` builders aren't meant to be
// introspected) — each test's queue is a direct, readable statement of what
// the action is expected to look up.
function makeQueueDb() {
  const selectQueue = [];
  const updateCalls = [];
  const insertCalls = [];
  const insertQueue = [];
  const db = {
    select() {
      return {
        from() {
          return {
            where() {
              const api = {
                limit: () => Promise.resolve(selectQueue.shift() ?? []),
                orderBy() {
                  return { limit: () => Promise.resolve(selectQueue.shift() ?? []) };
                },
                then: (res) => Promise.resolve(selectQueue.shift() ?? []).then(res),
              };
              return api;
            },
          };
        },
      };
    },
    update(table) {
      return {
        set(values) {
          return {
            where() {
              updateCalls.push({ table, values });
              return Promise.resolve(undefined);
            },
          };
        },
      };
    },
    insert(table) {
      return {
        values(values) {
          insertCalls.push({ table, values });
          const outcome = insertQueue.shift();
          const write = () =>
            outcome instanceof Error
              ? Promise.reject(outcome)
              : Promise.resolve(outcome);
          return {
            returning: () =>
              outcome === undefined
                ? Promise.resolve([{ id: "new-id" }])
                : write(),
            then: (resolve, reject) => write().then(resolve, reject),
          };
        },
      };
    },
  };
  return { db, selectQueue, updateCalls, insertCalls, insertQueue };
}

function uniqueConflict(constraint) {
  const error = new Error(`duplicate key violates ${constraint}`);
  error.name = "NeonDbError";
  error.code = "23505";
  error.constraint = constraint;
  return error;
}

let activeDb;
const dbProxy = new Proxy({}, {
  get(_target, property) {
    if (!activeDb) throw new Error("TEST_DB_NOT_CONFIGURED");
    const value = activeDb[property];
    return typeof value === "function" ? value.bind(activeDb) : value;
  },
});
mock.module("@/db", { exports: { db: dbProxy } });

// ── 1. Guest submission is rejected before any db access ─────────────────

test("startLessonQuiz rejects an unauthenticated (guest) caller", async () => {
  const { db } = makeQueueDb();
  activeDb = db;
  authMock = async () => null; // guest
  const { startLessonQuiz } = await import("../src/app/learn/quiz-actions.js?guest1");
  const res = await startLessonQuiz("html", "00-intro");
  assert.equal(res.ok, false);
  assert.equal(res.reason, "unauthenticated");
});

test("startOrResumeExam rejects an unauthenticated (guest) caller", async () => {
  const { db } = makeQueueDb();
  activeDb = db;
  authMock = async () => null;
  const { startOrResumeExam } = await import("../src/app/quiz/[tech]/exam-actions.js?guest1");
  const res = await startOrResumeExam("html");
  assert.equal(res.ok, false);
  assert.equal(res.reason, "unauthenticated");
});

test("issueSecureCertificate rejects an unauthenticated (guest) caller", async () => {
  const { db } = makeQueueDb();
  activeDb = db;
  authMock = async () => null;
  const { issueSecureCertificate } = await import("../src/app/certificate/actions.js?guest1");
  const res = await issueSecureCertificate("html", "HTML", "Someone");
  assert.equal(res.ok, false);
  assert.equal(res.reason, "unauthenticated");
});

// ── 2. Another user's attempt id must not be gradable/readable ───────────

test("submitLessonQuiz refuses to grade an attempt owned by a different user", async () => {
  const { db, selectQueue } = makeQueueDb();
  activeDb = db;
  selectQueue.push([
    {
      id: "attempt-1",
      userId: "victim-user",
      track: "html",
      lessonSlug: "00-intro",
      questionIds: JSON.stringify(["q1"]),
      optionOrder: JSON.stringify({ q1: [0, 1, 2, 3] }),
      status: "in_progress",
    },
  ]);
  authMock = async () => ({ user: { id: "attacker-user" } });
  const { submitLessonQuiz } = await import("../src/app/learn/quiz-actions.js?owner1");
  const res = await submitLessonQuiz("attempt-1", { q1: 0 });
  assert.equal(res.ok, false);
  assert.equal(res.reason, "not_found", "an attempt id belonging to another user must look indistinguishable from a nonexistent one");
});

// (moved to tests/exam-concurrency.test.mjs — now enforced by the SQL WHERE
// clause itself, so it's verified against a real Postgres, not a queue fake)

// ── 3. Duplicate / already-graded submission is idempotent, not re-gradable ──

test("submitLessonQuiz refuses to re-grade an attempt that's already graded", async () => {
  const { db, selectQueue } = makeQueueDb();
  activeDb = db;
  selectQueue.push([
    {
      id: "attempt-2",
      userId: "u1",
      track: "html",
      lessonSlug: "00-intro",
      questionIds: JSON.stringify(["q1"]),
      optionOrder: JSON.stringify({ q1: [0, 1, 2, 3] }),
      status: "graded",
      score: 1,
      passed: true,
    },
  ]);
  authMock = async () => ({ user: { id: "u1" } });
  const { submitLessonQuiz } = await import("../src/app/learn/quiz-actions.js?dup1");
  const res = await submitLessonQuiz("attempt-2", { q1: 0 });
  assert.equal(res.ok, false);
  assert.equal(res.reason, "already_graded");
});

// ── 4. Expired exam attempt rejects new answers ───────────────────────────

// (moved to tests/exam-concurrency.test.mjs — now enforced by the SQL WHERE
// clause itself, so it's verified against a real Postgres, not a queue fake)

// ── 5. Certificate issuance: not eligible without a passed exam attempt ──

test("issueSecureCertificate refuses issuance when there is no passed exam attempt", async () => {
  const { db, selectQueue } = makeQueueDb();
  activeDb = db;
  selectQueue.push([]); // no existing certificate
  selectQueue.push([]); // no passed exam attempt
  authMock = async () => ({ user: { id: "u1" } });
  const { issueSecureCertificate } = await import("../src/app/certificate/actions.js?elig1");
  const res = await issueSecureCertificate("html", "HTML", "Test Name");
  assert.equal(res.ok, false);
  assert.equal(res.reason, "not_eligible");
});

// ── 6. Certificate issuance is idempotent (one per user+track) ───────────

test("issueSecureCertificate returns the existing certId instead of issuing a duplicate", async () => {
  const { db, selectQueue, insertCalls } = makeQueueDb();
  activeDb = db;
  selectQueue.push([{ certId: "TCF-existing-123" }]); // already has one
  authMock = async () => ({ user: { id: "u1" } });
  const { issueSecureCertificate } = await import("../src/app/certificate/actions.js?idem1");
  const res = await issueSecureCertificate("html", "HTML", "Test Name");
  assert.equal(res.ok, true);
  assert.equal(res.certId, "TCF-existing-123");
  assert.equal(insertCalls.length, 0, "must not insert a second certificate row");
});

// ── 7. Certificate name is sanitized, never trusted raw ──────────────────

test("issueSecureCertificate rejects a name that is empty after sanitization (e.g. only control characters)", async () => {
  const { db, selectQueue } = makeQueueDb();
  activeDb = db;
  selectQueue.push([]); // no existing certificate
  authMock = async () => ({ user: { id: "u1" } });
  const { issueSecureCertificate } = await import("../src/app/certificate/actions.js?name1");
  const maliciousName = String.fromCharCode(0, 0x200e, 0x202e);
  const res = await issueSecureCertificate("html", "HTML", maliciousName);
  assert.equal(res.ok, false);
  assert.equal(res.reason, "invalid_name");
});

test("legacy issueCertificate cannot bypass the server-graded HTML exam", async () => {
  const { db, insertCalls } = makeQueueDb();
  activeDb = db;
  authMock = async () => ({ user: { id: "u1" } });
  const { issueCertificate } = await import("../src/app/certificate/actions.js?legacy-bypass1");
  const res = await issueCertificate({
    certId: "client-forged",
    track: "html",
    trackTitle: "Spoofed title",
    name: "Attacker",
    score: 80,
    total: 80,
    issuedAt: new Date().toISOString(),
  });
  assert.deepEqual(res, { recorded: false });
  assert.equal(insertCalls.length, 0);
});

test("secure certificate persists the server-trusted track title", async () => {
  const { db, selectQueue, insertCalls } = makeQueueDb();
  activeDb = db;
  selectQueue.push([]); // no existing certificate
  selectQueue.push([
    {
      id: "exam-passed",
      userId: "u1",
      track: "html",
      status: "graded",
      score: 32,
      total: 40,
      passed: true,
      submittedAt: new Date(),
    },
  ]);
  authMock = async () => ({ user: { id: "u1" } });
  const { issueSecureCertificate } = await import("../src/app/certificate/actions.js?trusted-title1");
  const res = await issueSecureCertificate("html", "Test Name");
  assert.equal(res.ok, true);
  assert.equal(insertCalls.length, 1);
  assert.equal(insertCalls[0].values.trackTitle, "HTML");
  assert.equal(insertCalls[0].values.examAttemptId, "exam-passed");
});

// ── 8. Exam prerequisite waiver is owner-only ────────────────────────────
// The owner may open any track's final exam for review without first passing
// its lesson quizzes, and without the 3-failures-per-24h cooldown. Every
// other role — admin included — stays fully gated.

test("a student with unpassed lesson quizzes is blocked from the final exam", async () => {
  const { db, selectQueue } = makeQueueDb();
  activeDb = db;
  selectQueue.push([]); // no in-progress exam
  selectQueue.push([]); // no passed lesson quizzes
  authMock = async () => ({ user: { id: "u1", role: "student" } });
  const { startOrResumeExam } = await import("../src/app/quiz/[tech]/exam-actions.js?gate-student");
  const res = await startOrResumeExam("html");
  assert.equal(res.ok, false);
  assert.equal(res.reason, "missing_lessons");
  assert.deepEqual(res.missing, ["00-intro"]);
});

test("the owner starts the final exam without passing lessons and without the failure cooldown", async () => {
  const { db, selectQueue, insertCalls } = makeQueueDb();
  activeDb = db;
  selectQueue.push([]); // no in-progress exam
  // Neither of the next two should ever be read: they are what a gated role
  // would hit — no passed lessons, and a spent failure window.
  selectQueue.push([]);
  selectQueue.push([
    { submittedAt: new Date() },
    { submittedAt: new Date() },
    { submittedAt: new Date() },
  ]);
  authMock = async () => ({ user: { id: "u1", role: "owner" } });
  const { startOrResumeExam } = await import("../src/app/quiz/[tech]/exam-actions.js?gate-owner");
  const res = await startOrResumeExam("html");
  assert.equal(res.ok, true);
  assert.equal(insertCalls.length, 1, "a real attempt row is still created — the exam itself is not skipped");
  assert.equal(
    selectQueue.length,
    2,
    "neither the eligibility nor the failed-attempt query should run for the owner"
  );
});

test("an admin does NOT inherit the owner's exam prerequisite waiver", async () => {
  const { db, selectQueue } = makeQueueDb();
  activeDb = db;
  selectQueue.push([]); // no in-progress exam
  selectQueue.push([]); // no passed lesson quizzes
  authMock = async () => ({ user: { id: "u1", role: "admin" } });
  const { startOrResumeExam } = await import("../src/app/quiz/[tech]/exam-actions.js?gate-admin");
  const res = await startOrResumeExam("html");
  assert.equal(res.ok, false);
  assert.equal(res.reason, "missing_lessons");
});

test("concurrent lesson-quiz starts converge on the winning in-progress attempt", async () => {
  const { db, selectQueue, insertQueue } = makeQueueDb();
  activeDb = db;
  selectQueue.push([]); // no row visible before the attempted insert
  selectQueue.push([
    {
      id: "lesson-winner",
      userId: "u1",
      track: "html",
      lessonSlug: "00-intro",
      questionIds: JSON.stringify(["q1"]),
      optionOrder: JSON.stringify({ q1: [0, 1, 2, 3] }),
      status: "in_progress",
    },
  ]);
  insertQueue.push(
    uniqueConflict("lesson_quiz_attempt_one_in_progress_per_lesson")
  );
  authMock = async () => ({ user: { id: "u1" } });
  const { startLessonQuiz } = await import("../src/app/learn/quiz-actions.js?race-lesson1");
  const res = await startLessonQuiz("html", "00-intro");
  assert.equal(res.ok, true);
  assert.equal(res.attemptId, "lesson-winner");
  assert.deepEqual(res.questions.map((question) => question.id), ["q1"]);
});

test("concurrent exam starts converge on the winning in-progress attempt", async () => {
  const { db, selectQueue, insertQueue } = makeQueueDb();
  activeDb = db;
  const expiresAt = new Date(Date.now() + 60_000);
  selectQueue.push([]); // no in-progress exam before insert
  selectQueue.push([{ lessonSlug: "00-intro" }]); // eligible
  selectQueue.push([]); // no recent failed attempts
  selectQueue.push([
    {
      id: "exam-winner",
      userId: "u1",
      track: "html",
      questionIds: JSON.stringify(["q1"]),
      optionOrder: JSON.stringify({ q1: [0, 1, 2, 3] }),
      answers: JSON.stringify({ q1: 2 }),
      status: "in_progress",
      expiresAt,
    },
  ]);
  insertQueue.push(uniqueConflict("exam_attempt_one_in_progress_per_track"));
  authMock = async () => ({ user: { id: "u1" } });
  const { startOrResumeExam } = await import("../src/app/quiz/[tech]/exam-actions.js?race-exam1");
  const res = await startOrResumeExam("html");
  assert.equal(res.ok, true);
  assert.equal(res.attemptId, "exam-winner");
  assert.deepEqual(res.answers, { q1: 2 });
  assert.equal(res.expiresAt, expiresAt.toISOString());
});

test("concurrent secure-certificate issuance returns the winning certificate", async () => {
  const { db, selectQueue, insertQueue } = makeQueueDb();
  activeDb = db;
  selectQueue.push([]); // no certificate before insert
  selectQueue.push([
    {
      id: "exam-passed",
      score: 35,
      total: 40,
      submittedAt: new Date(),
    },
  ]);
  selectQueue.push([{ certId: "TCF-concurrent-winner" }]);
  insertQueue.push(uniqueConflict("certificate_one_valid_per_user_track"));
  authMock = async () => ({ user: { id: "u1" } });
  const { issueSecureCertificate } = await import("../src/app/certificate/actions.js?race-cert1");
  const res = await issueSecureCertificate("html", "Test Name");
  assert.deepEqual(res, { ok: true, certId: "TCF-concurrent-winner" });
});

test("secure certificate renders the signed-out state before waiting on certificate lookup", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(
    new URL("../src/components/SecureCertificate.tsx", import.meta.url),
    "utf8"
  );
  const signedOutBranch = source.indexOf('if (sessionStatus === "unauthenticated")');
  const checkingBranch = source.indexOf('if (state.phase === "checking")');
  assert.ok(signedOutBranch >= 0, "the signed-out state must be handled explicitly");
  assert.ok(
    checkingBranch > signedOutBranch,
    "the checking placeholder must not hide the signed-out call to action"
  );
});

test("certificate migration and snapshot enforce the exam-attempt foreign key", async () => {
  const { readFile } = await import("node:fs/promises");
  const sql = await readFile(
    new URL("../drizzle/0026_html-quiz-exam-certificate-security.sql", import.meta.url),
    "utf8"
  );
  assert.match(
    sql,
    /FOREIGN KEY \("examAttemptId"\).*REFERENCES "public"\."exam_attempt"\("id"\).*ON DELETE set null/
  );
  const snapshot = JSON.parse(
    await readFile(new URL("../drizzle/meta/0026_snapshot.json", import.meta.url), "utf8")
  );
  assert.deepEqual(
    snapshot.tables["public.certificate"].foreignKeys[
      "certificate_examAttemptId_exam_attempt_id_fk"
    ],
    {
      name: "certificate_examAttemptId_exam_attempt_id_fk",
      tableFrom: "certificate",
      tableTo: "exam_attempt",
      columnsFrom: ["examAttemptId"],
      columnsTo: ["id"],
      onDelete: "set null",
      onUpdate: "no action",
    }
  );
  assert.match(sql, /CREATE UNIQUE INDEX "exam_attempt_one_in_progress_per_track"/);
  assert.match(sql, /CREATE UNIQUE INDEX "lesson_quiz_attempt_one_in_progress_per_lesson"/);
  assert.match(sql, /SET "status" = 'revoked'/);
  assert.match(sql, /CREATE UNIQUE INDEX "certificate_one_valid_per_user_track"/);
  assert.equal(
    snapshot.tables["public.exam_attempt"].indexes[
      "exam_attempt_one_in_progress_per_track"
    ].isUnique,
    true
  );
  assert.equal(
    snapshot.tables["public.lesson_quiz_attempt"].indexes[
      "lesson_quiz_attempt_one_in_progress_per_lesson"
    ].isUnique,
    true
  );
  assert.deepEqual(
    snapshot.tables["public.certificate"].indexes[
      "certificate_one_valid_per_user_track"
    ],
    {
      name: "certificate_one_valid_per_user_track",
      columns: [
        {
          expression: "userId",
          isExpression: false,
          asc: true,
          nulls: "last",
        },
        {
          expression: "track",
          isExpression: false,
          asc: true,
          nulls: "last",
        },
      ],
      isUnique: true,
      where: `"certificate"."status" = 'valid'`,
      concurrently: false,
      method: "btree",
      with: {},
    }
  );
});

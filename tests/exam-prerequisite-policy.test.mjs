import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

import {
  EXAM_PREREQUISITES,
  REQUIRED_LESSONS_VERSION,
  getExamPrerequisitePolicy,
  getRequiredLessons,
  isRequiredLesson,
} from "../src/lib/quiz-requirements.ts";
import {
  hasExamBank,
  hasTrackAssessment,
  getExamQuestionPool,
} from "../src/lib/quiz-bank.ts";

// The prerequisite policy decides who may START a final exam, so its default
// has to be "no". Before this policy existed the check was
// `getRequiredLessons(track).length === 0 → unavailable`, which conflated two
// very different situations: a track that deliberately has no lesson-quiz
// prerequisite, and a track nobody has configured at all. Making the first
// case work must not accidentally open the second.

test("HTML uses the lesson_quizzes policy with a non-empty required list", () => {
  const policy = getExamPrerequisitePolicy("html");
  assert.ok(policy, "html must have a declared policy");
  assert.equal(policy.mode, "lesson_quizzes");
  assert.ok(
    Array.isArray(policy.requiredLessons) && policy.requiredLessons.length > 0,
    "a lesson_quizzes policy with an empty list would gate on nothing"
  );

  // Regression guard: HTML behaviour is unchanged by the policy refactor.
  const required = getRequiredLessons("html");
  assert.equal(required.length, policy.requiredLessons.length);
  assert.ok(required.includes("00-intro"));
  assert.ok(required.includes("34-project-capstone"));
  assert.equal(isRequiredLesson("html", "00-intro"), true);
  assert.equal(isRequiredLesson("html", "not-a-lesson"), false);
});

test("AI/ML uses the final_exam_only policy and declares no required lessons", () => {
  const policy = getExamPrerequisitePolicy("ai-ml");
  assert.ok(policy, "ai-ml must have a declared policy");
  assert.equal(policy.mode, "final_exam_only");
  assert.ok(
    !("requiredLessons" in policy),
    "final_exam_only carries no lesson list at all"
  );

  assert.deepStrictEqual(
    getRequiredLessons("ai-ml"),
    [],
    "no lesson quizzes are required to sit the AI/ML final exam"
  );
  assert.equal(isRequiredLesson("ai-ml", "00-intro"), false);
});

test("an unconfigured track has no policy — it fails closed", () => {
  for (const unknown of ["", "no-such-track", "python", "__proto__", "toString"]) {
    assert.equal(
      getExamPrerequisitePolicy(unknown),
      null,
      `${JSON.stringify(unknown)} must resolve to null, not a policy`
    );
  }
});

test("an empty required list is never mistaken for 'no prerequisites'", () => {
  // Both an unconfigured track and a final_exam_only track return [] here.
  // That is exactly why callers must branch on the policy, not on the array.
  assert.deepStrictEqual(getRequiredLessons("no-such-track"), []);
  assert.deepStrictEqual(getRequiredLessons("ai-ml"), []);

  assert.equal(getExamPrerequisitePolicy("no-such-track"), null);
  assert.equal(getExamPrerequisitePolicy("ai-ml").mode, "final_exam_only");
});

test("every declared policy is one of the two known modes and is well formed", () => {
  const problems = [];
  for (const [track, policy] of Object.entries(EXAM_PREREQUISITES)) {
    if (policy.mode === "lesson_quizzes") {
      if (!Array.isArray(policy.requiredLessons) || policy.requiredLessons.length === 0) {
        problems.push(`${track}: lesson_quizzes with no required lessons`);
      } else if (new Set(policy.requiredLessons).size !== policy.requiredLessons.length) {
        problems.push(`${track}: duplicate entries in requiredLessons`);
      }
    } else if (policy.mode !== "final_exam_only") {
      problems.push(`${track}: unknown mode ${policy.mode}`);
    }
  }
  assert.deepStrictEqual(problems, []);
});

test("every track with a declared policy actually has a secure exam bank", () => {
  const missing = Object.keys(EXAM_PREREQUISITES).filter(
    (track) => !hasExamBank(track)
  );
  assert.deepStrictEqual(
    missing,
    [],
    "a declared policy without a question bank would let a learner start an exam with nothing to answer"
  );
});

test("the required-lessons version is bumped past the pre-policy value", () => {
  assert.ok(
    Number.isInteger(REQUIRED_LESSONS_VERSION) && REQUIRED_LESSONS_VERSION >= 2,
    "the policy rewrite is a deliberate, versioned change"
  );
});

// ── Assessment discovery ────────────────────────────────────────────────
//
// hasQuiz() alone only sees the legacy client-graded JSON, so a
// secure-exam-only track was invisible to every server-side consumer that
// asked "does this track have an assessment?" — static params, the sitemap,
// the homepage card, the track page, lesson navigation, the account
// dashboard and admin. hasTrackAssessment() is the union.

test("hasTrackAssessment finds AI/ML through its secure bank alone", () => {
  assert.equal(hasExamBank("ai-ml"), true);
  assert.equal(hasTrackAssessment("ai-ml"), true);
  assert.equal(
    getExamQuestionPool("ai-ml").length,
    90,
    "the pool the exam draws from"
  );
});

test("legacy quiz tracks stay discoverable", () => {
  const legacyDir = path.join(process.cwd(), "src", "content", "quizzes");
  const legacyTracks = fs
    .readdirSync(legacyDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));

  assert.ok(legacyTracks.length > 0, "expected legacy quiz files to exist");
  const undiscoverable = legacyTracks.filter((t) => !hasTrackAssessment(t));
  assert.deepStrictEqual(
    undiscoverable,
    [],
    "switching consumers to hasTrackAssessment must not hide any existing quiz"
  );
});

test("a track with neither a legacy quiz nor a secure bank is not discoverable", () => {
  assert.equal(hasTrackAssessment("no-such-track"), false);
  assert.equal(hasExamBank("no-such-track"), false);
});

test("server-side consumers ask for assessments, not just legacy quizzes", () => {
  // These files decide whether a track's /quiz and /certificate routes are
  // generated, linked and indexed. If one regresses to hasQuiz(), AI/ML
  // silently disappears from that surface.
  const consumers = [
    "src/app/quiz/[tech]/page.tsx",
    "src/app/certificate/[tech]/page.tsx",
    "src/app/sitemap.ts",
    "src/app/page.tsx",
    "src/app/learn/[tech]/page.tsx",
    "src/app/learn/[tech]/[lesson]/page.tsx",
    "src/app/account/page.tsx",
  ];

  const problems = [];
  for (const file of consumers) {
    const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    if (!source.includes("hasTrackAssessment")) {
      problems.push(`${file}: does not use hasTrackAssessment`);
    }
  }
  assert.deepStrictEqual(problems, []);
});

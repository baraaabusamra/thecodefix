// Canonical, server-trusted prerequisite policy for the FINAL exam
// (src/app/quiz/[tech]/exam-actions.ts → getExamEligibility).
//
// Deliberately hand-maintained, NOT derived from getLessons() at request
// time: content can change, and exam eligibility for an in-progress or
// already-earned certificate must never silently shift because a lesson
// file was added, renamed, or reordered. Update this module — and bump
// the version below — as a deliberate, reviewed decision alongside any
// curriculum change.
//
// Each track is one of two explicit modes:
//
//   - { mode: "lesson_quizzes", requiredLessons: [...] }
//       The learner must pass every lesson quiz in `requiredLessons`
//       before they can start the final exam. Today this is how HTML
//       works.
//
//   - { mode: "final_exam_only" }
//       No lesson-quiz attempts are required to start the final exam.
//       The final exam itself is still fully server-graded, randomized,
//       time-limited, answer-key protected, and only a passed attempt
//       mints a verified certificate. This is for tracks whose lessons
//       do not (yet) have secure lesson quiz banks — AI/ML today.
//
//   - <unconfigured track>
//       The track's exam is NOT eligible for any learner. The runtime
//       refuses to start an attempt and refuses to issue a certificate.
//       An empty `requiredLessons` array does NOT mean "final_exam_only"
//       — unknown tracks must fail closed, never silently permissive.

export const REQUIRED_LESSONS_VERSION = 2;

export type ExamPrerequisitePolicy =
  | {
      mode: "lesson_quizzes";
      requiredLessons: readonly string[];
    }
  | {
      mode: "final_exam_only";
    };

export const EXAM_PREREQUISITES: Record<string, ExamPrerequisitePolicy> = {
  html: {
    mode: "lesson_quizzes",
    requiredLessons: [
      "00-intro",
      "01-structure",
      "02-text",
      "03-links-images",
      "04-lists",
      "05-forms",
      "06-semantic",
      "07-attributes",
      "08-tables",
      "09-div-classes-id",
      "10-head-meta",
      "11-forms-advanced",
      "12-multimedia",
      "13-graphics",
      "14-web-apis",
      "15-layout-responsive",
      "16-entities-symbols",
      "17-javascript-code",
      "18-file-paths",
      "19-formatting-colors",
      "20-style-guide",
      "21-accessibility",
      "22-search-dirname",
      "24-responsive-images-performance",
      "25-links-embeds-security",
      "26-accessibility-deep",
      "27-interactive-elements",
      "28-performance-devtools",
      "29-project-resume",
      "30-project-article-seo",
      "31-project-accessible-table",
      "32-project-registration-form",
      "33-project-responsive-multisection",
      "34-project-capstone",
    ],
  },
  // AI/ML currently has no per-lesson secure quiz banks; the final exam
  // is the only path to a verified certificate.
  "ai-ml": {
    mode: "final_exam_only",
  },
};

/**
 * The declared policy for a track, or null when the track is unconfigured.
 *
 * The lookup is prototype-safe on purpose. `track` reaches this function
 * straight from a route param / Server Action argument, and a plain object
 * literal inherits from Object.prototype — so `EXAM_PREREQUISITES["__proto__"]`
 * or `["toString"]` would return an inherited member instead of undefined.
 * That value is truthy, so it sails past a `!policy` guard and then blows up
 * on `policy.requiredLessons`. Unknown tracks must resolve to null.
 */
export function getExamPrerequisitePolicy(track: string): ExamPrerequisitePolicy | null {
  if (!Object.prototype.hasOwnProperty.call(EXAM_PREREQUISITES, track)) {
    return null;
  }
  return EXAM_PREREQUISITES[track] ?? null;
}

/**
 * Required-lesson slugs for the final-exam eligibility check, for tracks
 * that use the `lesson_quizzes` mode. Returns `[]` for tracks that
 * either use `final_exam_only` or are unconfigured — the caller must
 * explicitly check `getExamPrerequisitePolicy(track)` to tell those apart.
 */
export function getRequiredLessons(track: string): string[] {
  const policy = getExamPrerequisitePolicy(track);
  if (!policy || policy.mode !== "lesson_quizzes") return [];
  return [...policy.requiredLessons];
}

export function isRequiredLesson(track: string, lessonSlug: string): boolean {
  return getRequiredLessons(track).includes(lessonSlug);
}

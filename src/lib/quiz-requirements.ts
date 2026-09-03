// Canonical, server-trusted list of "required" lessons per track for the
// lesson-quiz + final-exam eligibility system (src/app/learn/.../LessonQuiz,
// src/app/exam/[tech]/actions.ts). Deliberately a hand-maintained constant,
// NOT derived from getLessons() at request time: content can change, and
// exam eligibility for an in-progress or already-earned certificate must
// never silently shift because a lesson file was added, renamed, or
// reordered. Update this list — and bump the version below — as a
// deliberate, reviewed decision alongside any curriculum change.
//
// Excludes only the track's wrap-up/summary lesson (no testable content of
// its own). Practical projects ARE required — they're graded by the lesson
// quiz like any other lesson (the quiz questions test the concepts the
// project applies, not the project submission itself, since submissions
// aren't collected by this system).

export const REQUIRED_LESSONS_VERSION = 1;

export const REQUIRED_LESSONS: Record<string, string[]> = {
  html: [
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
};

export function getRequiredLessons(track: string): string[] {
  return REQUIRED_LESSONS[track] ?? [];
}

export function isRequiredLesson(track: string, lessonSlug: string): boolean {
  return getRequiredLessons(track).includes(lessonSlug);
}

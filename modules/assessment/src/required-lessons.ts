// Compatibility shim for an earlier draft import path. Keep one source of
// truth: src/lib/quiz-requirements.ts is the canonical, versioned list.
export {
  EXAM_PREREQUISITES,
  REQUIRED_LESSONS_VERSION,
  getRequiredLessons,
  isRequiredLesson,
  getExamPrerequisitePolicy,
  type ExamPrerequisitePolicy,
} from "./requirements";

import { getRequiredLessons } from "./requirements";

export function requiredLessonCount(track: string): number {
  return getRequiredLessons(track).length;
}

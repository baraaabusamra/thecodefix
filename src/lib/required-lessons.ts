// Compatibility shim for an earlier draft import path. Keep one source of
// truth: src/lib/quiz-requirements.ts is the canonical, versioned list.
export {
  REQUIRED_LESSONS,
  REQUIRED_LESSONS_VERSION,
  getRequiredLessons,
  isRequiredLesson,
} from "@/lib/quiz-requirements";

import { getRequiredLessons } from "@/lib/quiz-requirements";

export function requiredLessonCount(track: string): number {
  return getRequiredLessons(track).length;
}

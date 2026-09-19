import type { GradedQuestion } from "@/lib/quiz-bank";

// Answer-key disclosure policy for the FINAL exam (lesson quizzes are
// practice and keep showing answers). After a FAILED attempt the learner
// sees only which questions they got wrong — never the correct option or the
// explanation — otherwise three attempts would harvest most of the pool. The
// answer key is revealed only once the exam is passed.
export type ExamQuestionOutcome = {
  id: string;
  q: string;
  options: string[];
  selectedIndex: number | null;
  correct: boolean;
  correctIndex?: number; // passed attempts only
  explain?: string; // passed attempts only
};

export function applyAnswerKeyPolicy(results: GradedQuestion[], passed: boolean): ExamQuestionOutcome[] {
  if (passed) return results;
  return results.map(({ id, q, options, selectedIndex, correct }) => ({
    id,
    q,
    options,
    selectedIndex,
    correct,
  }));
}

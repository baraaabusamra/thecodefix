// Shared progress types (no client/server directive) so both the client store
// (progress.ts) and the server actions (progress-actions.ts) can import them.

export type QuizResult = { score: number; total: number; passedAt: string };

export type Progress = {
  name: string;
  completedLessons: Record<string, string[]>; // track -> lesson slugs
  quizzes: Record<string, QuizResult>; // track -> best result
};

export const EMPTY_PROGRESS: Progress = {
  name: "",
  completedLessons: {},
  quizzes: {},
};

export const PASS_RATIO = 0.6; // 60% to pass and earn a certificate

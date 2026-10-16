// UNTRUSTED UI PRACTICE quizzes — not a trusted assessment.
//
// There are two quiz systems in this codebase and they sit on opposite sides
// of a trust boundary. Read this before using anything here for a score:
//
//   THIS MODULE (packages/content/src/quizzes.ts)          SERVER-TRUSTED (modules/assessment/src/quiz-bank.ts)
//   content/ar/quizzes/<track>.json       content/ar/quiz-bank/<track>.json
//   ships `answer` and `explain`           serves SanitizedQuestion: no answer
//   graded in the browser by QuizRunner    graded on the server
//   result is UI state only                result is an exam_attempt row
//
// `getQuiz()` returns the correct-answer index. That is deliberate — a
// practice quiz has to grade itself in the browser, so its answer key is
// public by construction. The consequence is that NOTHING a learner reports
// from this path may ever be believed: points, the leaderboard, quiz passes
// and certificates all read server-graded exam attempts instead (see
// modules/progress/src/trusted-stats.ts, which exists precisely to keep these apart).
//
// So: use this for practice UI. If a result needs to be trusted, it belongs
// in the exam path, not here. Server code may safely use the *shape* of a
// quiz — modules/progress/src/actions/progress.ts reads `questions.length` to validate an
// import — but must not take a score from the client for it.

import fs from "node:fs";
import path from "node:path";
import { contentDir } from "./paths";

const QUIZ_DIR = contentDir("quizzes");

export type Question = {
  q: string;
  options: string[];
  answer: number; // index of correct option
  explain: string;
};

export type Quiz = {
  title: string;
  questions: Question[];
};

export function getQuiz(track: string): Quiz | null {
  const file = path.join(QUIZ_DIR, `${track}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as Quiz;
}

export function hasQuiz(track: string): boolean {
  return fs.existsSync(path.join(QUIZ_DIR, `${track}.json`));
}

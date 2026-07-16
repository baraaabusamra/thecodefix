import fs from "node:fs";
import path from "node:path";

const QUIZ_DIR = path.join(process.cwd(), "src", "content", "quizzes");

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

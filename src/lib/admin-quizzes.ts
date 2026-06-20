import fs from "node:fs";
import path from "node:path";
import { isContentWritable } from "./admin-content";

// Raw file access for the quiz bank. Reading works everywhere; writing is
// dev-only (production filesystem is read-only) — same as lessons/jobs.

const QUIZ_DIR = path.join(process.cwd(), "src", "content", "quizzes");

export function quizFilePath(track: string): string {
  return path.join(QUIZ_DIR, `${track}.json`);
}

export function readRawQuiz(track: string): string | null {
  const file = quizFilePath(track);
  if (!fs.existsSync(file)) return null;
  return fs.readFileSync(file, "utf-8");
}

export function isValidQuizJson(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.title === "string" &&
      Array.isArray(parsed.questions)
    );
  } catch {
    return false;
  }
}

export function writeRawQuiz(track: string, content: string): void {
  if (!isContentWritable()) {
    throw new Error("Content is read-only in production.");
  }
  const file = quizFilePath(track);
  if (!fs.existsSync(file)) {
    throw new Error("Quiz not found.");
  }
  if (!isValidQuizJson(content)) {
    throw new Error("Quiz JSON must be an object with title + questions.");
  }
  fs.writeFileSync(file, content, "utf-8");
}

import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { quizQuestions, quizAttempts, type QuizQuestion } from "@/db/schema";
import { getQuiz as getFileQuiz } from "@/lib/quiz";
import type { Question } from "@/lib/quiz";

function parseOptions(raw: string): string[] {
  try { return JSON.parse(raw); } catch { return []; }
}

function toQuestion(row: QuizQuestion): Question {
  return {
    q: row.question,
    options: parseOptions(row.options),
    answer: row.answer,
    explain: row.explain,
  };
}

export async function getQuizQuestions(track: string): Promise<Question[]> {
  if (!db) return getFileQuiz(track)?.questions ?? [];

  const rows = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.track, track))
    .orderBy(asc(quizQuestions.order));

  if (rows.length > 0) return rows.map(toQuestion);

  // Fallback: seed from file on first access
  const fileQuiz = getFileQuiz(track);
  if (!fileQuiz) return [];

  const seeds = fileQuiz.questions.map((q, i) => ({
    track,
    question: q.q,
    options: JSON.stringify(q.options),
    answer: q.answer,
    explain: q.explain,
    order: i,
  }));

  await db.insert(quizQuestions).values(seeds).onConflictDoNothing();
  const seeded = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.track, track))
    .orderBy(asc(quizQuestions.order));

  return seeded.length > 0 ? seeded.map(toQuestion) : fileQuiz.questions;
}

export async function getQuizMeta(track: string): Promise<{
  title: string;
  questionCount: number;
}> {
  if (!db) return { title: "", questionCount: 0 };
  const fileQuiz = getFileQuiz(track);
  return {
    title: fileQuiz?.title ?? "",
    questionCount: (await getQuizQuestions(track)).length,
  };
}

export async function hasDbQuiz(track: string): Promise<boolean> {
  if (!db) return false;
  const rows = await db
    .select({ id: quizQuestions.id })
    .from(quizQuestions)
    .where(eq(quizQuestions.track, track))
    .limit(1);
  return rows.length > 0;
}

export async function recordAttempt(
  userId: string,
  track: string,
  questionId: string | null,
  selected: number,
  correct: boolean,
): Promise<void> {
  if (!db) return;
  await db.insert(quizAttempts).values({ userId, track, questionId, selected, correct });
}

export async function getAttemptStats(track: string): Promise<{
  total: number;
  correct: number;
}> {
  if (!db) return { total: 0, correct: 0 };
  const rows = await db
    .select()
    .from(quizAttempts)
    .where(eq(quizAttempts.track, track));
  return {
    total: rows.length,
    correct: rows.filter((r) => r.correct).length,
  };
}

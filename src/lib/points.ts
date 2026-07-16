import type { Progress } from "./progress-types";
import { PASS_RATIO } from "./progress-types";

// Gamification v1 — points are COMPUTED from real progress (nothing stored,
// nothing fake): lessons and passed quizzes earn fixed points, and thresholds
// map to named levels. Server sync can reuse the same math later.

export const LESSON_POINTS = 10;
export const QUIZ_POINTS = 50;

export type Level = { threshold: number; title: string; icon: string };

export const LEVELS: Level[] = [
  { threshold: 0, title: "مبتدئ", icon: "🌱" },
  { threshold: 100, title: "متعلّم", icon: "📘" },
  { threshold: 300, title: "مثابر", icon: "🔥" },
  { threshold: 700, title: "محترف صاعد", icon: "🚀" },
  { threshold: 1500, title: "خبير", icon: "⚡" },
  { threshold: 3000, title: "أسطورة", icon: "👑" },
];

export type Gamification = {
  points: number;
  level: Level;
  levelIndex: number; // 1-based, human friendly
  nextLevel: Level | null; // null at max level
  pctToNext: number; // 0-100 progress within the current level band
  lessonsDone: number;
  quizzesPassed: number;
};

export function computeGamification(progress: Progress): Gamification {
  const lessonsDone = Object.values(progress.completedLessons ?? {}).reduce(
    (n, l) => n + l.length,
    0
  );
  const quizzesPassed = Object.values(progress.quizzes ?? {}).filter(
    (r) => r.score / r.total >= PASS_RATIO
  ).length;

  const points = lessonsDone * LESSON_POINTS + quizzesPassed * QUIZ_POINTS;

  let i = 0;
  while (i + 1 < LEVELS.length && points >= LEVELS[i + 1].threshold) i++;
  const level = LEVELS[i];
  const nextLevel = LEVELS[i + 1] ?? null;
  const pctToNext = nextLevel
    ? Math.min(
        100,
        Math.round(
          ((points - level.threshold) / (nextLevel.threshold - level.threshold)) * 100
        )
      )
    : 100;

  return { points, level, levelIndex: i + 1, nextLevel, pctToNext, lessonsDone, quizzesPassed };
}

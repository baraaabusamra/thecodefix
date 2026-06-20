"use client";

import { useCallback, useEffect, useState } from "react";

// Local-first progress store. Swap this module's internals for a real
// auth/DB-backed API later; the component API (useProgress) stays the same.

const KEY = "tcf:progress";
const EVENT = "tcf:progress-change";

export type QuizResult = { score: number; total: number; passedAt: string };

export type Progress = {
  name: string;
  completedLessons: Record<string, string[]>; // track -> lesson slugs
  quizzes: Record<string, QuizResult>; // track -> best result
};

const EMPTY: Progress = { name: "", completedLessons: {}, quizzes: {} };

export function readProgress(): Progress {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

function write(p: Progress) {
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new Event(EVENT));
}

export function setName(name: string) {
  write({ ...readProgress(), name });
}

export function toggleLesson(track: string, lesson: string) {
  const p = readProgress();
  const done = new Set(p.completedLessons[track] ?? []);
  if (done.has(lesson)) done.delete(lesson);
  else done.add(lesson);
  write({
    ...p,
    completedLessons: { ...p.completedLessons, [track]: [...done] },
  });
}

export function recordQuiz(track: string, score: number, total: number) {
  const p = readProgress();
  const prev = p.quizzes[track];
  // keep the best score
  if (prev && prev.score >= score) return;
  write({
    ...p,
    quizzes: {
      ...p.quizzes,
      [track]: { score, total, passedAt: new Date().toISOString() },
    },
  });
}

/** Reactive hook — re-renders on any progress change in this tab or others. */
export function useProgress(): Progress {
  const [p, setP] = useState<Progress>(EMPTY);
  useEffect(() => {
    const update = () => setP(readProgress());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return p;
}

export function useLessonDone(track: string, lesson: string) {
  const p = useProgress();
  const done = (p.completedLessons[track] ?? []).includes(lesson);
  const toggle = useCallback(
    () => toggleLesson(track, lesson),
    [track, lesson]
  );
  return [done, toggle] as const;
}

export const PASS_RATIO = 0.6; // 60% to pass and earn a certificate

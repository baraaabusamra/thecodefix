"use client";

import { useCallback, useEffect, useState } from "react";
import { saveMyProgress } from "@/app/progress-actions";
import {
  EMPTY_PROGRESS as EMPTY,
  PASS_RATIO,
  type Progress,
  type QuizResult,
} from "@/lib/progress-types";

// Progress store. localStorage is the fast local cache; for signed-in users it
// is also persisted to the database (see saveMyProgress) so progress syncs
// across devices. The component API (useProgress, toggleLesson, …) is unchanged.

export type { Progress, QuizResult };
export { PASS_RATIO };

const KEY = "tcf:progress";
const EVENT = "tcf:progress-change";

export function readProgress(): Progress {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : EMPTY;
  } catch {
    return EMPTY;
  }
}

// Update local cache only (used when hydrating from the server).
function writeLocal(p: Progress) {
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new Event(EVENT));
}

// Update local cache and persist to the DB (no-ops server-side if anonymous).
function write(p: Progress) {
  writeLocal(p);
  saveMyProgress(p).catch(() => {});
}

/** Overwrite the local cache with server-loaded progress (signed-in users). */
export function hydrateProgress(p: Progress) {
  writeLocal(p);
}

export function setName(name: string) {
  write({ ...readProgress(), name, version: Date.now() });
}

export function toggleLesson(track: string, lesson: string) {
  const p = readProgress();
  const done = new Set(p.completedLessons[track] ?? []);
  if (done.has(lesson)) done.delete(lesson);
  else done.add(lesson);
  write({
    ...p,
    completedLessons: { ...p.completedLessons, [track]: [...done] },
    version: Date.now(),
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
    version: Date.now(),
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

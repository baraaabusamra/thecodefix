"use client";

import { useCallback, useEffect, useState } from "react";
import { completeLesson, saveMyName, uncompleteLesson } from "@/app/progress-actions";
import {
  EMPTY_PROGRESS as EMPTY,
  PASS_RATIO,
  type Progress,
  type QuizResult,
} from "@/lib/progress-types";

// Progress store. localStorage is the fast local cache and the ONLY store for
// guests. For signed-in users each lesson toggle is also sent to the server as
// a single request (completeLesson / uncompleteLesson) — the server owns the
// trusted record (lesson_completion). Quiz results here are UNTRUSTED UI
// state: they are never sent as scores; points/ranking/certificates come from
// server-graded attempts. The component API (useProgress, toggleLesson, …) is
// unchanged.

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


/** Overwrite the local cache with server-loaded progress (signed-in users). */
export function hydrateProgress(p: Progress) {
  writeLocal(p);
}

// Union completed lessons + best-score-wins quizzes, so signing in on a
// second device never discards real progress made on either side — a blind
// "server wins" overwrite silently lost a browser's unsynced progress the
// instant its owner signed in.
export function mergeProgress(local: Progress, server: Progress): Progress {
  const completedLessons: Progress["completedLessons"] = {};
  const tracks = new Set([
    ...Object.keys(local.completedLessons),
    ...Object.keys(server.completedLessons),
  ]);
  for (const track of tracks) {
    const merged = new Set([
      ...(local.completedLessons[track] ?? []),
      ...(server.completedLessons[track] ?? []),
    ]);
    completedLessons[track] = [...merged];
  }

  const quizzes: Progress["quizzes"] = { ...server.quizzes };
  for (const [track, localResult] of Object.entries(local.quizzes)) {
    const serverResult = quizzes[track];
    if (!serverResult || localResult.score > serverResult.score) {
      quizzes[track] = localResult;
    }
  }

  return {
    name: server.name || local.name,
    completedLessons,
    quizzes,
  };
}

export function setName(name: string) {
  writeLocal({ ...readProgress(), name });
  saveMyName(name).catch(() => {});
}

export function toggleLesson(track: string, lesson: string) {
  const p = readProgress();
  const done = new Set(p.completedLessons[track] ?? []);
  const completing = !done.has(lesson);
  if (completing) done.add(lesson);
  else done.delete(lesson);
  writeLocal({
    ...p,
    completedLessons: { ...p.completedLessons, [track]: [...done] },
  });
  // No-op server-side for guests; for signed-in users the server validates
  // and records it.
  (completing ? completeLesson(track, lesson) : uncompleteLesson(track, lesson)).catch(() => {});
}

// UNTRUSTED: a client-graded practice-quiz result, kept in this browser only
// for the quiz UI and the unverified printable completion page. Never sent to
// the server as a score.
export function recordQuiz(track: string, score: number, total: number) {
  const p = readProgress();
  const prev = p.quizzes[track];
  // keep the best score
  if (prev && prev.score >= score) return;
  writeLocal({
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

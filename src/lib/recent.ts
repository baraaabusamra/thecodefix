"use client";

import { useEffect, useState } from "react";

// Remembers the last lesson the learner opened, so the homepage can offer a
// "continue where you left off" shortcut. localStorage only.

export type RecentLesson = {
  track: string;
  slug: string;
  title: string;
  trackTitle: string;
};

const KEY = "tcf:recent";

export function recordRecent(r: RecentLesson) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

export function useRecent(): RecentLesson | null {
  const [r, setR] = useState<RecentLesson | null>(null);
  // localStorage is browser-only, so the read has to happen on mount in an
  // effect to keep SSR output and the first client render in sync.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time mount sync from localStorage
      setR(raw ? (JSON.parse(raw) as RecentLesson) : null);
    } catch {
      setR(null);
    }
  }, []);
  return r;
}

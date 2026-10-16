"use client";

import { useCallback, useEffect, useState } from "react";

// Lightweight local bookmarks (saved lessons). Stored in localStorage only —
// no account needed. Each entry keeps enough to render a link without a fetch.

export type Bookmark = {
  track: string;
  slug: string;
  title: string;
  trackTitle: string;
};

const KEY = "tcf:bookmarks";
const EVENT = "tcf:bookmarks-change";

export function readBookmarks(): Bookmark[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Bookmark[]) : [];
  } catch {
    return [];
  }
}

function write(list: Bookmark[]) {
  localStorage.setItem(KEY, JSON.stringify(list));
  window.dispatchEvent(new Event(EVENT));
}

export function toggleBookmark(b: Bookmark) {
  const list = readBookmarks();
  const i = list.findIndex((x) => x.track === b.track && x.slug === b.slug);
  if (i >= 0) list.splice(i, 1);
  else list.unshift(b);
  write(list);
}

/** Reactive list of all bookmarks. */
export function useBookmarks(): Bookmark[] {
  const [list, setList] = useState<Bookmark[]>([]);
  useEffect(() => {
    const update = () => setList(readBookmarks());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return list;
}

/** Reactive bookmarked-state + toggle for a single lesson. */
export function useBookmark(b: Bookmark) {
  const list = useBookmarks();
  const saved = list.some((x) => x.track === b.track && x.slug === b.slug);
  const toggle = useCallback(() => toggleBookmark(b), [b]);
  return [saved, toggle] as const;
}

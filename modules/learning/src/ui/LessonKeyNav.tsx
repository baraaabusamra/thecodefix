"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Arrow-key navigation between lessons. The page is RTL and "next" sits on the
// left, so ArrowLeft → next, ArrowRight → previous. Ignores typing in inputs.
export default function LessonKeyNav({
  prev,
  next,
}: {
  prev: string | null;
  next: string | null;
}) {
  const router = useRouter();
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      if (el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (el && (el as HTMLElement).isContentEditable) return;
      if (e.key === "ArrowLeft" && next) router.push(next);
      if (e.key === "ArrowRight" && prev) router.push(prev);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, router]);
  return null;
}

"use client";

import { useEffect, useState } from "react";

// Thin neon bar pinned under the sticky header that fills as the reader
// scrolls through the lesson article.
export default function ReadingProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const article = document.querySelector("article");
    if (!article) return;

    function update() {
      const el = article as HTMLElement;
      const start = el.offsetTop;
      const total = el.offsetHeight - window.innerHeight;
      const scrolled = window.scrollY - start;
      const p = total > 0 ? (scrolled / total) * 100 : 0;
      setPct(Math.min(100, Math.max(0, p)));
    }

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] h-1 bg-transparent"
      aria-hidden
    >
      <div
        className="h-full bg-gradient-to-l from-brand-purple to-brand-cyan transition-[width] duration-75"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

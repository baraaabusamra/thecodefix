"use client";

import { useEffect, useState } from "react";

// Floating "back to top" button that appears once the reader scrolls down.
export default function ScrollToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!show) return null;

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="العودة للأعلى"
      className="fixed bottom-6 left-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-brand-purple text-lg text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-brand-purple/40"
    >
      ↑
    </button>
  );
}

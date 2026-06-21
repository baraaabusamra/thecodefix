"use client";

import Link from "next/link";
import { useRef } from "react";

type Subject = { slug: string; title: string };

// Horizontally scrollable subject list with left/right arrow buttons
// (W3Schools-style). Arrows scroll the row by a fixed amount.
export default function SubjectsBarScroller({
  subjects,
}: {
  subjects: Subject[];
}) {
  const ref = useRef<HTMLDivElement>(null);

  const scroll = (dir: -1 | 1) =>
    ref.current?.scrollBy({ left: dir * 260, behavior: "smooth" });

  return (
    <div className="relative mx-auto max-w-6xl">
      {/* Left arrow */}
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="السابق"
        className="absolute left-0 top-0 z-10 grid h-full w-8 place-items-center bg-[#20232e] text-white/70 transition hover:text-white"
      >
        ‹
      </button>

      {/* Scrollable subjects */}
      <div
        ref={ref}
        className="flex items-center overflow-x-auto px-9 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {subjects.map((s) => (
          <Link
            key={s.slug}
            href={`/learn/${s.slug}`}
            className="whitespace-nowrap px-3 py-2 text-xs font-bold uppercase tracking-wide text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            {s.title}
          </Link>
        ))}
      </div>

      {/* Right arrow */}
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="التالي"
        className="absolute right-0 top-0 z-10 grid h-full w-8 place-items-center bg-[#20232e] text-white/70 transition hover:text-white"
      >
        ›
      </button>
    </div>
  );
}

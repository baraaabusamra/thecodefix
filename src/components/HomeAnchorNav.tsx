"use client";

import { useEffect, useRef, useState } from "react";

type Item = { slug: string; title: string; color: string };

export default function HomeAnchorNav({ items }: { items: Item[] }) {
  const [active, setActive] = useState<string | null>(items[0]?.slug ?? null);
  const navRef = useRef<HTMLDivElement>(null);

  // Highlight the subject section currently near the top of the viewport.
  useEffect(() => {
    const sections = items
      .map((i) => document.getElementById(i.slug))
      .filter((el): el is HTMLElement => el !== null);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length) setActive(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -65% 0px", threshold: 0 }
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [items]);

  // Keep the active chip in view inside the horizontal nav (mobile).
  useEffect(() => {
    if (!active || !navRef.current) return;
    const chip = navRef.current.querySelector<HTMLElement>(
      `[data-slug="${active}"]`
    );
    chip?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [active]);

  return (
    <nav className="sticky top-[60px] z-40 border-y border-border bg-background/90 backdrop-blur">
      <div
        ref={navRef}
        className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-2.5 text-sm"
      >
        {items.map((i) => {
          const isActive = active === i.slug;
          return (
            <a
              key={i.slug}
              href={`#${i.slug}`}
              data-slug={i.slug}
              onClick={() => setActive(i.slug)}
              className="shrink-0 rounded-full border px-3 py-1 font-medium transition"
              style={
                isActive
                  ? { backgroundColor: i.color, borderColor: i.color, color: "#fff" }
                  : { borderColor: `${i.color}55`, color: "var(--muted)" }
              }
            >
              {i.title}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

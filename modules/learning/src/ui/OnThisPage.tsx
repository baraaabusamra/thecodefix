"use client";

import { useEffect, useState } from "react";

type Heading = { id: string; text: string; level: number };

// "On this page" navigation: reads the rendered lesson headings (which already
// carry ids from rehype-slug) and tracks the active section while scrolling.
// Two variants:
//   - "sidebar" (default): the xl+ sticky column on lesson pages.
//   - "collapsible": a <details> box for phones/tablets and single-column
//     pages (blog articles) where there is no room for a side rail.
export default function OnThisPage({
  variant = "sidebar",
  className = "",
}: {
  variant?: "sidebar" | "collapsible";
  className?: string;
}) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLHeadingElement>("article h2, article h3")
    ).filter((h) => h.id);

    // Headings only exist in the rendered DOM, so we read them on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of the rendered article DOM
    setHeadings(
      nodes.map((h) => ({
        id: h.id,
        text: h.textContent ?? "",
        level: h.tagName === "H3" ? 3 : 2,
      }))
    );

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(e.target.id);
        }
      },
      { rootMargin: "-80px 0px -70% 0px", threshold: 0 }
    );
    nodes.forEach((n) => observer.observe(n));
    return () => observer.disconnect();
  }, []);

  if (headings.length < 2) return null;

  const list = (
    <ul className="space-y-1 border-r border-border pr-3">
      {headings.map((h) => (
        <li key={h.id} className={h.level === 3 ? "pr-3" : ""}>
          <a
            href={`#${h.id}`}
            onClick={
              variant === "collapsible"
                ? (e) => e.currentTarget.closest("details")?.removeAttribute("open")
                : undefined
            }
            className={`block rounded py-1 transition ${
              active === h.id
                ? "font-semibold text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ul>
  );

  if (variant === "collapsible") {
    return (
      <details className={`rounded-xl border border-border bg-surface ${className}`}>
        <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold">
          📋 في هذه الصفحة ({headings.length})
        </summary>
        <nav
          aria-label="محتويات الصفحة"
          className="max-h-[50vh] overflow-y-auto border-t border-border px-4 py-3 text-sm"
        >
          {list}
        </nav>
      </details>
    );
  }

  return (
    <nav className={`text-sm ${className}`} aria-label="محتويات الصفحة">
      <p className="mb-3 font-bold text-muted">في هذه الصفحة</p>
      {list}
    </nav>
  );
}

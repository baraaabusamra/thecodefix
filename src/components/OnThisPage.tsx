"use client";

import { useEffect, useState } from "react";

type Heading = { id: string; text: string; level: number };

// "On this page" sidebar: reads the rendered lesson headings (which already
// carry ids from rehype-slug) and tracks the active section while scrolling.
export default function OnThisPage() {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    const nodes = Array.from(
      document.querySelectorAll<HTMLHeadingElement>("article h2, article h3")
    ).filter((h) => h.id);

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

  return (
    <nav className="text-sm" aria-label="محتويات الصفحة">
      <p className="mb-3 font-bold text-muted">في هذه الصفحة</p>
      <ul className="space-y-1 border-r border-border pr-3">
        {headings.map((h) => (
          <li key={h.id} className={h.level === 3 ? "pr-3" : ""}>
            <a
              href={`#${h.id}`}
              className={`block rounded py-1 transition ${
                active === h.id
                  ? "font-semibold text-brand-purple"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

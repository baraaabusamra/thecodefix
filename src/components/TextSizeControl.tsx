"use client";

import { useEffect, useState } from "react";

// Lets readers scale lesson text for comfort on any device (small phone → TV).
// Persists choice in localStorage and applies it via the --reading-scale var.
const SCALES = [
  { key: "sm", label: "ص", value: "0.92" },
  { key: "base", label: "ع", value: "1" },
  { key: "lg", label: "ك", value: "1.15" },
  { key: "xl", label: "كك", value: "1.3" },
];
const KEY = "tcf:reading-scale";

export default function TextSizeControl() {
  const [active, setActive] = useState("base");

  useEffect(() => {
    const saved = localStorage.getItem(KEY) ?? "base";
    apply(saved);
    setActive(saved);
  }, []);

  function apply(key: string) {
    const scale = SCALES.find((s) => s.key === key)?.value ?? "1";
    document.documentElement.style.setProperty("--reading-scale", scale);
  }

  function choose(key: string) {
    apply(key);
    setActive(key);
    localStorage.setItem(KEY, key);
  }

  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border border-border p-0.5"
      role="group"
      aria-label="حجم الخط"
    >
      {SCALES.map((s) => (
        <button
          key={s.key}
          type="button"
          onClick={() => choose(s.key)}
          aria-pressed={active === s.key}
          title="حجم الخط"
          className={`rounded-full px-2 py-1 text-xs font-bold leading-none transition ${
            active === s.key
              ? "bg-brand-purple text-white"
              : "text-muted hover:text-foreground"
          }`}
        >
          {s.label}
        </button>
      ))}
    </span>
  );
}

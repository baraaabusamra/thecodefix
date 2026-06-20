"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label="تبديل المظهر"
      className="rounded-full px-3 py-2 text-sm text-white/85 transition hover:bg-white/10 hover:text-white"
    >
      {dark ? "☀️" : "🌙"}
    </button>
  );
}

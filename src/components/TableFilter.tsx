"use client";

import { useState } from "react";

// Live client-side filter for a server-rendered table. Hides rows whose text
// doesn't match the query — no refactor of the table needed.
export default function TableFilter({
  targetId,
  placeholder = "تصفية...",
}: {
  targetId: string;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");

  function onChange(value: string) {
    setQ(value);
    const needle = value.trim().toLowerCase();
    const rows = document.querySelectorAll<HTMLTableRowElement>(
      `#${targetId} tbody tr`
    );
    rows.forEach((row) => {
      const match =
        !needle || (row.textContent ?? "").toLowerCase().includes(needle);
      row.style.display = match ? "" : "none";
    });
  }

  return (
    <input
      value={q}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full max-w-xs rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-purple"
    />
  );
}

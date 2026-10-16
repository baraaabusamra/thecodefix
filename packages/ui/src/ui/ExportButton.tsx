"use client";

// Generic CSV export button. Builds a CSV from rows (array of objects) and
// triggers a client-side download — no server round-trip.
export default function ExportButton({
  rows,
  filename,
  label = "تصدير CSV",
}: {
  rows: Record<string, string | number>[];
  filename: string;
  label?: string;
}) {
  function download() {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const escape = (v: string | number) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
    ].join("\n");

    // BOM so Excel reads Arabic (UTF-8) correctly
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={download}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-semibold transition hover:border-brand-cyan/60 hover:text-brand-cyan"
    >
      <span aria-hidden>⬇️</span>
      {label}
    </button>
  );
}

"use client";

// Prints the current lesson (print CSS strips the site chrome).
export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted transition hover:border-brand-purple/50 hover:text-foreground"
    >
      <span aria-hidden>🖨️</span>
      طباعة
    </button>
  );
}

"use client";

// Header search box that opens the global command palette instead of
// navigating. Falls back gracefully — the palette also opens on ⌘K / Ctrl+K.
export default function SearchTrigger() {
  function open() {
    window.dispatchEvent(new Event("tcf:open-search"));
  }
  return (
    <>
      {/* Phone: compact icon button — the full pill below doesn't fit */}
      <button
        type="button"
        onClick={open}
        aria-label="بحث"
        className="rounded-full p-2 text-base leading-none text-white/85 transition hover:bg-white/10 sm:hidden"
      >
        🔍
      </button>
      <button
        type="button"
        onClick={open}
        aria-label="بحث"
        className="hidden items-center gap-2 rounded-full bg-white/10 py-1.5 pe-3 ps-3 text-sm text-white/60 transition hover:bg-white/15 sm:flex"
      >
        <span>🔍</span>
        <span>بحث...</span>
        <kbd className="rounded border border-white/20 px-1.5 text-xs">Ctrl K</kbd>
      </button>
    </>
  );
}

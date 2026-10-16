"use client";

import { useRef, useState } from "react";

// Space-saving search: a lone magnifier icon that expands into a real input
// on click (width transition), collapses on blur/Escape. Submitting goes to
// /search; Ctrl+K still opens the command palette (global listener).
export default function ExpandableSearch() {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form
      action="/search"
      className={`flex items-center overflow-hidden rounded-full border transition-all duration-300 ease-out ${
        open
          ? "w-52 border-brand-cyan/50 bg-white/10 shadow-[0_0_16px_-6px_var(--brand-cyan)] sm:w-64"
          : "w-9 border-transparent bg-transparent"
      }`}
      onSubmit={(e) => {
        if (!inputRef.current?.value.trim()) e.preventDefault();
      }}
    >
      <button
        type="button"
        aria-label={open ? "أغلق البحث" : "افتح البحث"}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next) setTimeout(() => inputRef.current?.focus(), 50);
            return next;
          });
        }}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-white/85 transition hover:bg-white/10 hover:text-brand-cyan"
      >
        🔍
      </button>
      <input
        ref={inputRef}
        name="q"
        placeholder="ابحث عن درس أو وسم..."
        aria-label="بحث"
        tabIndex={open ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
        onBlur={(e) => {
          // Collapse only when focus leaves the whole form (not to the button).
          if (!e.currentTarget.value && !e.relatedTarget) setOpen(false);
        }}
        className={`min-w-0 flex-1 bg-transparent pe-3 text-sm text-white outline-none placeholder:text-white/40 ${
          open ? "" : "pointer-events-none"
        }`}
      />
    </form>
  );
}

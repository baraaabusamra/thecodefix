"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

// Hamburger menu shown only on mobile (md:hidden). The panel is rendered in a
// portal on <body>: the header's backdrop-blur makes it the containing block
// for fixed/absolute descendants, so a dropdown rendered inside it gets
// trapped under the subjects bar and its backdrop can't cover the page.
export default function MobileMenu({
  links,
}: {
  links: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);

  // Close on Escape for keyboard users, and lock body scroll while open so the
  // page behind the menu doesn't scroll under a user's thumb.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="القائمة"
        aria-expanded={open}
        className="rounded p-2 text-xl leading-none text-white/85 transition hover:bg-white/10"
      >
        ☰
      </button>

      {open &&
        createPortal(
          <div className="fixed inset-0 z-[100] md:hidden">
            {/* Tap-outside backdrop */}
            <button
              type="button"
              aria-label="إغلاق القائمة"
              onClick={() => setOpen(false)}
              className="absolute inset-0 cursor-default bg-black/60"
            />
            <div className="absolute inset-x-0 top-0 max-h-[85vh] overflow-y-auto border-b border-white/10 bg-[#16141d] shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <span className="font-bold text-white">القائمة</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="إغلاق"
                  className="rounded p-2 text-xl leading-none text-white/85 transition hover:bg-white/10"
                >
                  ✕
                </button>
              </div>
              <form
                action="/search"
                className="flex items-center gap-2 border-b border-white/10 p-3"
                onSubmit={() => setOpen(false)}
              >
                <input
                  name="q"
                  placeholder="بحث..."
                  aria-label="بحث"
                  className="min-w-0 flex-1 rounded-full bg-white/10 px-4 py-2 text-sm text-white outline-none placeholder:text-white/50"
                />
                <button className="shrink-0 rounded-full bg-brand-purple px-4 py-2 text-sm font-semibold text-white">
                  بحث
                </button>
              </form>
              <nav className="flex flex-col p-2">
                {links.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="rounded px-3 py-3 text-white/85 transition hover:bg-white/10 hover:text-white"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

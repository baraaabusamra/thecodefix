"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Hamburger menu shown only on mobile (md:hidden). Opens a full-width dropdown
// under the header with the nav links + search, since those are hidden on
// small screens in the desktop header.
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
        {open ? "✕" : "☰"}
      </button>

      {open && (
        <>
          {/* Tap-outside backdrop */}
          <button
            type="button"
            aria-label="إغلاق القائمة"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-black/40"
          />
          <div className="absolute inset-x-0 top-full z-50 max-h-[80vh] overflow-y-auto border-t border-white/10 bg-[#282a35] shadow-lg">
            <form
              action="/search"
              className="flex items-center gap-2 border-b border-white/10 p-3"
              onSubmit={() => setOpen(false)}
            >
              <input
                name="q"
                placeholder="بحث..."
                aria-label="بحث"
                className="flex-1 rounded-full bg-white/10 px-4 py-2 text-sm text-white outline-none placeholder:text-white/50"
              />
              <button className="rounded-full bg-brand-purple px-4 py-2 text-sm font-semibold text-white">
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
        </>
      )}
    </div>
  );
}

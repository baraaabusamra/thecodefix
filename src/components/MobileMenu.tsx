"use client";

import { useState } from "react";
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
        <div className="absolute inset-x-0 top-full z-50 border-t border-white/10 bg-[#282a35] shadow-lg">
          <form
            action="/search"
            className="flex items-center gap-2 border-b border-white/10 p-3"
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
      )}
    </div>
  );
}

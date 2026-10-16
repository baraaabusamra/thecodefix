"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type MegaGroup = {
  label: string;
  icon: string;
  tracks: { slug: string; title: string; icon: string }[];
};

// "المسارات" mega menu (desktop only): opens on hover with a small close
// delay so the pointer can travel into the panel, toggles on click for
// touch/keyboard, closes on Escape / outside click / link click.
// Replaces the old full-width subjects bar row.
export default function MegaMenu({ groups }: { groups: MegaGroup[] }) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClickOutside(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClickOutside);
      cancelClose();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        className={`flex items-center gap-1.5 rounded px-3 py-2 text-sm transition ${
          open ? "bg-white/10 text-white" : "text-white/85 hover:bg-white/10 hover:text-white"
        }`}
      >
        المسارات
        <span
          aria-hidden
          className={`text-[10px] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          className="absolute start-0 top-full z-50 w-[min(92vw,780px)] pt-2"
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
        >
          <div
            className="rounded-2xl border border-brand-purple/30 bg-[#0e0c16]/95 p-5 shadow-2xl shadow-brand-purple/20 backdrop-blur-xl"
            style={{ boxShadow: "0 0 40px -12px var(--brand-purple), 0 24px 48px -24px #000" }}
          >
            <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-3">
              {groups.map((g) => (
                <div key={g.label}>
                  <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-cyan">
                    <span>{g.icon}</span> {g.label}
                  </p>
                  <ul className="space-y-0.5">
                    {g.tracks.map((t) => (
                      <li key={t.slug}>
                        <Link
                          href={`/learn/${t.slug}`}
                          onClick={() => setOpen(false)}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-white/80 transition hover:bg-brand-cyan/10 hover:text-brand-cyan"
                        >
                          <span className="text-base">{t.icon}</span>
                          {t.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
              <Link
                href="/learn"
                onClick={() => setOpen(false)}
                className="text-sm font-semibold text-brand-purple transition hover:text-white"
              >
                كل المسارات ({groups.reduce((n, g) => n + g.tracks.length, 0)}) ←
              </Link>
              <Link
                href="/reference"
                onClick={() => setOpen(false)}
                className="text-sm text-white/60 transition hover:text-brand-cyan"
              >
                تبحث عن وسم أو خاصية؟ المرجع السريع
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

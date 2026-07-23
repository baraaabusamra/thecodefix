"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { useProgress } from "@/lib/progress";

// The header's auth area — one component so the two states can never
// contradict each other:
//   signed OUT → "دخول" + the prominent "ابدأ مجانًا" CTA (no avatar)
//   signed IN  → avatar dropdown (name, real progress stats, sign out) — CTA hidden
export default function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const progress = useProgress();

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
    };
  }, []);

  if (status === "loading") {
    return <span className="h-9 w-9 animate-pulse rounded-full bg-white/10" />;
  }

  // ── Signed out: CTA + login, no avatar ──
  if (!session?.user) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => signIn()}
          className="whitespace-nowrap rounded-full px-3 py-2 text-sm font-semibold text-white/85 transition hover:bg-white/10 hover:text-white"
        >
          دخول
        </button>
        {/* Hidden below sm: the hero repeats this CTA and the phone bar is full. */}
        <span className="hidden sm:block">
          <Link href="/learn" className="btn-neon whitespace-nowrap px-4 py-2 text-sm">
            ابدأ مجانًا
          </Link>
        </span>
      </div>
    );
  }

  // ── Signed in: avatar dropdown, no CTA ──
  const user = session.user;
  const initial = (user.name ?? user.email ?? "؟").trim().charAt(0).toUpperCase();
  const completedCount = Object.values(progress.completedLessons ?? {}).reduce(
    (n, lessons) => n + lessons.length,
    0
  );
  const passedQuizzes = Object.values(progress.quizzes ?? {}).filter(
    (r) => r.score / r.total >= 0.6
  ).length;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="قائمة الحساب"
        className={`grid h-9 w-9 place-items-center overflow-hidden rounded-full border-2 transition ${
          open
            ? "border-brand-purple shadow-[0_0_14px_-2px_var(--brand-purple)]"
            : "border-white/25 hover:border-brand-purple/70"
        }`}
      >
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="text-sm font-bold text-brand-cyan">{initial}</span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-brand-purple/30 bg-[#0e0c16]/95 shadow-2xl backdrop-blur-xl">
          {/* Identity */}
          <div className="border-b border-white/10 px-4 py-3">
            <p className="truncate font-semibold text-white">{user.name ?? "متعلّم"}</p>
            <p className="truncate text-xs text-white/50" dir="ltr">
              {user.email}
            </p>
          </div>

          {/* Real progress stats (points system lands with gamification phase) */}
          <div className="grid grid-cols-2 gap-px border-b border-white/10 bg-white/5">
            <div className="bg-[#0e0c16] px-4 py-2.5 text-center">
              <p className="text-lg font-bold text-brand-cyan">{completedCount}</p>
              <p className="text-[11px] text-white/50">درسًا مكتملًا</p>
            </div>
            <div className="bg-[#0e0c16] px-4 py-2.5 text-center">
              <p className="text-lg font-bold text-brand-purple">{passedQuizzes}</p>
              <p className="text-[11px] text-white/50">اختبارًا ناجحًا</p>
            </div>
          </div>

          {/* Actions */}
          <nav className="p-1.5 text-sm">
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-white/85 transition hover:bg-brand-cyan/10 hover:text-brand-cyan"
            >
              📊 حسابي وتقدّمي
            </Link>
            <Link
              href="/creators/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-white/85 transition hover:bg-brand-cyan/10 hover:text-brand-cyan"
            >
              🎬 منصة المبدعين
            </Link>
            <button
              onClick={() => signOut()}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-red-400 transition hover:bg-red-500/10"
            >
              🚪 تسجيل الخروج
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}

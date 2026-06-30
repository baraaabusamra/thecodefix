"use client";

import Link from "next/link";
import { useState } from "react";
import { useProgress, setName, PASS_RATIO } from "@/lib/progress";
import { useBookmarks } from "@/lib/bookmarks";
import AchievementsGrid from "@/components/AchievementsGrid";

export type TrackInfo = {
  slug: string;
  title: string;
  icon: string;
  lessonCount: number;
  hasQuiz: boolean;
};

export default function AccountDashboard({ tracks }: { tracks: TrackInfo[] }) {
  const progress = useProgress();
  const bookmarks = useBookmarks();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const totalLessons = tracks.reduce((a, t) => a + t.lessonCount, 0);
  const totalDone = tracks.reduce(
    (a, t) => a + (progress.completedLessons[t.slug]?.length ?? 0),
    0
  );
  const certificates = tracks.filter((t) => {
    const r = progress.quizzes[t.slug];
    return r && r.score / r.total >= PASS_RATIO;
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      {/* Profile header */}
      <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-6">
        <div>
          <p className="text-sm text-muted">مرحبًا،</p>
          {editing || !progress.name ? (
            <div className="mt-1 flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="اكتب اسمك"
                aria-label="اسمك"
                className="rounded-lg border border-border bg-background px-3 py-1.5 outline-none"
              />
              <button
                onClick={() => {
                  if (draft.trim()) setName(draft.trim());
                  setEditing(false);
                }}
                className="rounded-lg bg-brand-purple px-3 py-1.5 text-sm font-semibold text-white"
              >
                حفظ
              </button>
            </div>
          ) : (
            <h1 className="text-2xl font-bold">
              {progress.name}{" "}
              <button
                onClick={() => {
                  setDraft(progress.name);
                  setEditing(true);
                }}
                className="text-sm font-normal text-muted hover:text-foreground"
              >
                (تعديل)
              </button>
            </h1>
          )}
        </div>
        <div className="text-center">
          <p className="text-2xl font-bold neon-text">
            {totalDone}/{totalLessons}
          </p>
          <p className="text-xs text-muted">دروس مكتملة</p>
        </div>
      </div>

      {/* Achievements */}
      <div className="mb-8">
        <AchievementsGrid />
      </div>

      {/* Certificates */}
      {certificates.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-xl font-bold">🏆 شهاداتك</h2>
          <div className="flex flex-wrap gap-3">
            {certificates.map((t) => (
              <Link
                key={t.slug}
                href={`/certificate/${t.slug}`}
                className="rounded-xl border border-brand-cyan bg-surface px-4 py-2 text-sm font-semibold neon-glow"
              >
                {t.icon} شهادة {t.title}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Bookmarks */}
      {bookmarks.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-xl font-bold">★ الدروس المحفوظة</h2>
          <div className="space-y-2">
            {bookmarks.map((b) => (
              <Link
                key={`${b.track}-${b.slug}`}
                href={`/learn/${b.track}/${b.slug}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition hover:neon-glow"
              >
                <span className="font-medium">{b.title}</span>
                <span className="shrink-0 text-xs text-brand-cyan">
                  {b.trackTitle}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Per-track progress */}
      <h2 className="mb-3 text-xl font-bold">تقدّمك في المسارات</h2>
      <div className="space-y-3">
        {tracks.map((t) => {
          const done = progress.completedLessons[t.slug]?.length ?? 0;
          const pct = t.lessonCount
            ? Math.round((done / t.lessonCount) * 100)
            : 0;
          const quiz = progress.quizzes[t.slug];
          return (
            <div
              key={t.slug}
              className="rounded-2xl border border-border bg-surface p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <Link
                  href={`/learn/${t.slug}`}
                  className="font-semibold hover:neon-text"
                >
                  {t.icon} {t.title}
                </Link>
                <span className="text-sm text-muted">
                  {done}/{t.lessonCount} درس
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-background">
                <div
                  className="h-full rounded-full bg-brand-purple"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2 flex items-center gap-3 text-sm">
                {t.hasQuiz && (
                  <Link
                    href={`/quiz/${t.slug}`}
                    className="text-brand-cyan hover:underline"
                  >
                    {quiz ? `الاختبار: ${quiz.score}/${quiz.total}` : "ابدأ الاختبار"}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

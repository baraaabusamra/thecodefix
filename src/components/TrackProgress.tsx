"use client";

import Link from "next/link";
import { useProgress } from "@/lib/progress";

// Track-page progress card: shows completion % for this track and a button to
// resume at the first incomplete lesson. Renders nothing until the learner
// has started (keeps the page clean for newcomers).
export default function TrackProgress({
  track,
  color,
  lessons,
}: {
  track: string;
  color: string;
  lessons: { slug: string; title: string }[];
}) {
  const progress = useProgress();
  const done = new Set(progress.completedLessons[track] ?? []);
  const count = lessons.filter((l) => done.has(l.slug)).length;
  if (count === 0 || lessons.length === 0) return null;

  const pct = Math.round((count / lessons.length) * 100);
  const next = lessons.find((l) => !done.has(l.slug));

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold">تقدّمك في هذا المسار</span>
        <span className="text-muted">
          {count} / {lessons.length} ({pct}%)
        </span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-background">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      {next ? (
        <Link
          href={`/learn/${track}/${next.slug}`}
          style={{ backgroundColor: color }}
          className="mt-4 inline-block rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          تابع: {next.title} ❮
        </Link>
      ) : (
        <p className="mt-4 text-sm font-semibold text-green-500">
          🎉 أكملت كل دروس هذا المسار!
        </p>
      )}
    </div>
  );
}

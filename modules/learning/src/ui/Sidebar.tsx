"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LessonSummary } from "@tcf/content/tracks";
import { useProgress } from "@tcf/progress/progress";

export default function Sidebar({
  track,
  trackTitle,
  lessons,
  hideTitle = false,
}: {
  track: string;
  trackTitle: string;
  lessons: LessonSummary[];
  // The mobile disclosure on lesson pages already labels itself with the
  // track name, so it hides this inner heading.
  hideTitle?: boolean;
}) {
  const pathname = usePathname();
  const progress = useProgress();
  const done = new Set(progress.completedLessons[track] ?? []);

  return (
    <nav className="space-y-1 text-sm">
      {!hideTitle && <p className="mb-3 font-bold">{trackTitle}</p>}
      {lessons.map((l, i) => {
        const href = `/learn/${track}/${l.slug}`;
        const active = pathname === href;
        const isDone = done.has(l.slug);
        return (
          <Link
            key={l.slug}
            href={href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 transition ${
              active
                ? "bg-brand-purple/15 text-brand-purple font-semibold"
                : "text-muted hover:bg-surface hover:text-foreground"
            }`}
          >
            <span className={isDone ? "text-green-500" : "text-muted"}>
              {isDone ? "✓" : `${i + 1}.`}
            </span>
            {l.title}
          </Link>
        );
      })}
      <Link
        href={`/quiz/${track}`}
        className="mt-3 block rounded-lg border border-brand-purple px-3 py-2 text-center font-semibold text-brand-purple hover:bg-brand-purple/10"
      >
        🧠 اختبار {trackTitle}
      </Link>
    </nav>
  );
}

"use client";

import Link from "next/link";
import { useRecent } from "@tcf/progress/recent";

// Homepage shortcut: if the learner has opened a lesson before, offer to
// jump straight back in. Renders nothing for first-time visitors.
export default function ContinueLearning() {
  const recent = useRecent();
  if (!recent) return null;

  return (
    <section className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 py-5 sm:flex-row">
        <div>
          <p className="text-sm text-muted">تابع من حيث توقّفت</p>
          <p className="font-bold">
            {recent.title}{" "}
            <span className="text-sm font-normal text-brand-cyan">
              · {recent.trackTitle}
            </span>
          </p>
        </div>
        <Link
          href={`/learn/${recent.track}/${recent.slug}`}
          className="btn-neon shrink-0 px-6 py-2.5 text-sm"
        >
          متابعة التعلّم ❮
        </Link>
      </div>
    </section>
  );
}

"use client";

import { useLessonDone } from "@/lib/progress";

export default function LessonComplete({
  track,
  lesson,
}: {
  track: string;
  lesson: string;
}) {
  const [done, toggle] = useLessonDone(track, lesson);
  return (
    <button
      onClick={toggle}
      className={`rounded-xl border px-5 py-2.5 text-sm font-semibold transition ${
        done
          ? "border-green-500 bg-green-500/10 text-green-500"
          : "border-brand-purple text-brand-purple hover:bg-brand-purple/10"
      }`}
    >
      {done ? "✓ تم إكمال هذا الدرس" : "وضع علامة: أكملت الدرس"}
    </button>
  );
}

"use client";

import { useLessonDone } from "@/lib/progress";
import { trackProductEvent } from "@/lib/analytics";

export default function LessonComplete({
  track,
  lesson,
}: {
  track: string;
  lesson: string;
}) {
  const [done, toggle] = useLessonDone(track, lesson);
  function handleToggle() {
    if (!done) trackProductEvent("lesson_complete", { track, lesson });
    toggle();
  }
  return (
    <button
      onClick={handleToggle}
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

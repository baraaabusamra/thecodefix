"use client";

import { useEffect, useState } from "react";

// Lightweight "was this lesson helpful?" widget. Stores the reader's vote per
// lesson in localStorage (no backend), and thanks them after voting.
export default function LessonFeedback({
  track,
  lesson,
}: {
  track: string;
  lesson: string;
}) {
  const key = `tcf:feedback:${track}/${lesson}`;
  const [vote, setVote] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    const v = localStorage.getItem(key);
    if (v === "up" || v === "down") setVote(v);
  }, [key]);

  function cast(v: "up" | "down") {
    setVote(v);
    try {
      localStorage.setItem(key, v);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="no-print my-10 rounded-2xl border border-border bg-surface p-5 text-center">
      {vote ? (
        <p className="font-semibold text-brand-cyan">
          شكرًا لملاحظتك! 🙏
          {vote === "down" && " سنعمل على تحسين هذا الدرس."}
        </p>
      ) : (
        <>
          <p className="mb-3 font-semibold">هل كان هذا الدرس مفيدًا؟</p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={() => cast("up")}
              className="rounded-full border border-border px-5 py-2 text-sm font-semibold transition hover:border-green-500 hover:text-green-500"
            >
              👍 نعم
            </button>
            <button
              type="button"
              onClick={() => cast("down")}
              className="rounded-full border border-border px-5 py-2 text-sm font-semibold transition hover:border-red-500 hover:text-red-500"
            >
              👎 يحتاج تحسينًا
            </button>
          </div>
        </>
      )}
    </div>
  );
}

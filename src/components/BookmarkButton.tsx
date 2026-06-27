"use client";

import { useBookmark, type Bookmark } from "@/lib/bookmarks";

export default function BookmarkButton(props: Bookmark) {
  const [saved, toggle] = useBookmark(props);
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={saved}
      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition ${
        saved
          ? "border-brand-cyan bg-brand-cyan/10 text-brand-cyan"
          : "border-border text-muted hover:border-brand-cyan/50 hover:text-foreground"
      }`}
    >
      <span aria-hidden>{saved ? "★" : "☆"}</span>
      {saved ? "محفوظ" : "احفظ الدرس"}
    </button>
  );
}

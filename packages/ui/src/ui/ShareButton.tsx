"use client";

import { useState } from "react";

// Shares the current lesson: uses the native share sheet on mobile, otherwise
// copies the page URL to the clipboard.
export default function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted transition hover:border-brand-purple/50 hover:text-foreground"
    >
      <span aria-hidden>🔗</span>
      {copied ? "نُسخ الرابط" : "مشاركة"}
    </button>
  );
}

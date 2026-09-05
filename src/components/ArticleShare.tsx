"use client";

import { trackProductEvent } from "@/lib/analytics";
import { SITE_URL } from "@/lib/site";

// One-click share for blog articles → amplifies the manual distribution.
// WhatsApp is first-class (high reach in MENA). Fires an article_shared event.
export default function ArticleShare({
  slug,
  title,
}: {
  slug: string;
  title: string;
}) {
  const url = `${SITE_URL}/blog/${slug}`;
  const text = `${title} — The Code Fix`;

  function shareTo(platform: "linkedin" | "x" | "whatsapp") {
    const links: Record<typeof platform, string> = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`,
    };
    trackProductEvent("article_share", { slug, platform });
    window.open(links[platform], "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-muted">شارك المقال:</span>
      <button
        type="button"
        onClick={() => shareTo("whatsapp")}
        className="rounded-full bg-[#25D366] px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        واتساب
      </button>
      <button
        type="button"
        onClick={() => shareTo("linkedin")}
        className="rounded-full bg-[#0A66C2] px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        in LinkedIn
      </button>
      <button
        type="button"
        onClick={() => shareTo("x")}
        className="rounded-full bg-black px-4 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
      >
        𝕏
      </button>
    </div>
  );
}

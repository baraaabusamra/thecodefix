"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ApprovedSubmission } from "@/lib/creators";

type GalleryProps = {
  submissions: ApprovedSubmission[];
  currentPlatform?: string;
  currentSearch?: string;
};

const PLATFORMS = [
  { value: "", label: "الكل" },
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
];

const PLATFORM_ICONS: Record<string, string> = {
  youtube: "▶",
  instagram: "📷",
  tiktok: "🎵",
  facebook: "👍",
};

export default function VideoGallery({ submissions, currentPlatform, currentSearch }: GalleryProps) {
  const [search, setSearch] = useState(currentSearch ?? "");
  const [platform, setPlatform] = useState(currentPlatform ?? "");

  const filtered = submissions.filter((s) => {
    if (platform && s.platform !== platform) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.title.toLowerCase().includes(q) ||
        s.creatorDisplayName.toLowerCase().includes(q) ||
        (s.hashtags ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="mx-auto flex max-w-6xl flex-col px-4 py-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold">فيديوهات المبدعين</h1>
        <p className="mt-2 text-muted">
          دروس وشروحات من مجتمع المبرمجين العرب.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن فيديو…"
          className="flex-1 rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
        />
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
          className="rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
        >
          {PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-muted">لا توجد نتائج.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((sub) => (
            <div key={sub.id} className="card-glow group overflow-hidden rounded-xl border border-border transition hover:border-accent/50">
              <div className="relative aspect-video bg-surface/60">
                {sub.thumbnail ? (
                  <Image
                    src={sub.thumbnail}
                    alt={sub.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-4xl text-muted">
                    {PLATFORM_ICONS[sub.platform] ?? "🎬"}
                  </div>
                )}
                <span className="absolute left-2 top-2 rounded-md bg-background/80 px-2 py-0.5 text-xs font-medium backdrop-blur-sm">
                  {PLATFORM_ICONS[sub.platform]} {PLATFORMS.find((p) => p.value === sub.platform)?.label ?? sub.platform}
                </span>
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{sub.title}</h3>
                <p className="mt-1 text-xs text-muted">
                  <Link href={`/creators/${encodeURIComponent(sub.creatorDisplayName)}`} className="hover:text-brand-cyan">
                    {sub.creatorDisplayName}
                  </Link>
                </p>
                {sub.description && (
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{sub.description}</p>
                )}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-muted">
                    {new Date(sub.createdAt).toLocaleDateString("ar-SA")}
                  </span>
                  <a
                    href={sub.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-brand-cyan hover:underline"
                  >
                    عرض ←
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

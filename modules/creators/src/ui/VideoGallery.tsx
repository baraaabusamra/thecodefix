"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { ApprovedPost } from "../creators";

type GalleryProps = {
  submissions: ApprovedPost[];
  currentSearch?: string;
};

export default function VideoGallery({ submissions, currentSearch }: GalleryProps) {
  const [search, setSearch] = useState(currentSearch ?? "");

  const filtered = submissions.filter((s) => {
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
        <h1 className="text-3xl font-bold">منشورات المبدعين</h1>
        <p className="mt-2 text-muted">
          دروس وشروحات من مجتمع المبرمجين العرب.
        </p>
      </div>

      <div className="mt-8">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث عن منشور…"
          className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5 sm:max-w-md"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-muted">لا توجد نتائج.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((sub) => (
            <div key={sub.id} className="card-glow group overflow-hidden rounded-xl border border-border transition hover:border-accent/50">
              <div className="relative aspect-video bg-surface/60">
                {sub.imageUrl ? (
                  <Image
                    src={sub.imageUrl}
                    alt={sub.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full items-center justify-center p-4 text-center text-sm text-muted">
                    {sub.body.slice(0, 120)}
                  </div>
                )}
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
                  <Link
                    href={`/creators/${encodeURIComponent(sub.creatorDisplayName)}/${sub.id}`}
                    className="hover:text-accent"
                  >
                    {sub.title}
                  </Link>
                </h3>
                <p className="mt-1 text-xs text-muted">
                  <Link href={`/creators/${encodeURIComponent(sub.creatorDisplayName)}`} className="hover:text-brand-cyan">
                    {sub.creatorDisplayName}
                  </Link>
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-muted">{sub.body}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[11px] text-muted">
                    {new Date(sub.createdAt).toLocaleDateString("ar-SA")}
                  </span>
                  {sub.link && (
                    <a
                      href={sub.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-brand-cyan hover:underline"
                    >
                      عرض ←
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

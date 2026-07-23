import { z } from "zod";
import Link from "next/link";
import type { Metadata } from "next";
import { searchLessons } from "@/lib/content";

export const metadata: Metadata = {
  title: "البحث",
  description: "ابحث في كل دروس The Code Fix بالعربي.",
  // Query-parameter result pages are thin/duplicate — keep them out of the
  // index (but let crawlers follow the links they surface).
  robots: { index: false, follow: true },
};

const searchParamsSchema = z.object({
  q: z.string().max(200).optional().default(""),
});

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = searchParamsSchema.parse(await searchParams);
  const results = await searchLessons(q);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <form action="/search" className="glass mb-8 flex items-center gap-2 rounded-xl p-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="ابحث عن موضوع..."
          aria-label="ابحث عن موضوع"
          className="flex-1 bg-transparent px-3 py-2 outline-none placeholder:text-muted"
          autoFocus
        />
        <button className="btn-neon px-5 py-2">ابحث</button>
      </form>

      {q && (
        <p className="mb-4 text-muted">
          {results.length} نتيجة عن «{q}»
        </p>
      )}

      <div className="space-y-3">
        {results.map((r) => (
          <Link
            key={`${r.track}-${r.slug}`}
            href={`/learn/${r.track}/${r.slug}`}
            className="glass card-glow block rounded-xl p-4"
          >
            <span className="text-xs text-brand-cyan">{r.trackTitle}</span>
            <p className="font-semibold">{r.title}</p>
            <p className="text-sm text-muted">{r.description}</p>
          </Link>
        ))}
        {q && results.length === 0 && (
          <p className="text-muted">لا توجد نتائج. جرّب كلمات أخرى.</p>
        )}
      </div>
    </div>
  );
}

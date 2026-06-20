import Link from "next/link";
import type { Metadata } from "next";
import { searchLessons } from "@/lib/content";

export const metadata: Metadata = {
  title: "البحث",
  description: "ابحث في كل دروس The Code Fix بالعربي.",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const results = searchLessons(q);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <form action="/search" className="mb-8 flex items-center gap-2 rounded-xl border border-border bg-surface p-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="ابحث عن موضوع..."
          className="flex-1 bg-transparent px-3 py-2 outline-none"
          autoFocus
        />
        <button className="rounded-lg bg-brand-purple px-4 py-2 font-semibold text-white">
          ابحث
        </button>
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
            className="block rounded-xl border border-border bg-surface p-4 transition hover:neon-glow"
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

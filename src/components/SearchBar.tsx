"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useCallback, useEffect } from "react";
import type { SearchResult } from "@/lib/search";

export default function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    const { searchLessons } = await import("@/lib/search");
    const res = await searchLessons(q);
    setResults(res);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 200);
  }, [query, doSearch]);

  const handleSelect = (slug: string, track: string) => {
    setOpen(false);
    setQuery("");
    router.push(`/tracks/${track}/${slug}`);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="search"
        placeholder="ابحث في الدروس..."
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
        className="w-full rounded-xl border border-border bg-surface px-4 py-2 text-sm outline-none transition-colors focus:border-accent"
      />
      {open && results.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-xl border border-border bg-surface shadow-lg">
          {results.map((r) => (
            <li key={`${r.track}/${r.slug}`}>
              <button
                type="button"
                onMouseDown={() => handleSelect(r.slug, r.track)}
                className="w-full px-4 py-2 text-right text-sm transition-colors hover:bg-surface-2"
              >
                <span className="block truncate font-medium">{r.title}</span>
                <span className="block truncate text-xs text-muted">{r.trackTitle}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

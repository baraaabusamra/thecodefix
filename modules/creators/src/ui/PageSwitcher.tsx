"use client";

import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import type { CreatorRow } from "../creators";

type PageSwitcherProps = {
  pages: CreatorRow[];
  activeId: string;
};

// Lets a user switch which of their pages (personal + any brand/company
// pages) they're currently managing — same idea as switching between
// LinkedIn Company Pages you admin.
export default function PageSwitcher({ pages, activeId }: PageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  if (pages.length <= 1) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/40 p-2">
      <span className="px-2 text-xs text-muted">تدير الآن:</span>
      <select
        value={activeId}
        onChange={(e) => router.push(`${pathname}?page=${e.target.value}`)}
        className="rounded-lg border border-border bg-black/5 px-3 py-1.5 text-sm outline-none focus:border-accent dark:bg-white/5"
      >
        {pages.map((p) => (
          <option key={p.id} value={p.id}>
            {p.displayName}
          </option>
        ))}
      </select>
      <Link
        href="/creators/register"
        className="mr-auto rounded-lg px-3 py-1.5 text-xs font-medium text-brand-cyan hover:underline"
      >
        + صفحة جديدة
      </Link>
    </div>
  );
}

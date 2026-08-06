"use client";

import { useState } from "react";
import Link from "next/link";
import type { StudyPlanCategory } from "@/lib/academic-study-plans";

const BRANCH_COLORS = ["#B026FF", "#26E5FF", "#FF6EC7", "#7CFFB2", "#FFD166", "#FF7A59"];

export default function StudyPlanTree({
  programNameEn,
  degree,
  totalCreditHours,
  categories,
  country,
  university,
}: {
  programNameEn: string;
  degree: string;
  totalCreditHours: number;
  categories: StudyPlanCategory[];
  country: string;
  university: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(
    categories.length ? 0 : null
  );

  return (
    <div className="study-tree">
      <style>{`
        .study-tree .branches { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; justify-content: center; gap: 0; position: relative; }
        .study-tree .branches::before { content: ''; display: block; width: 1px; height: 20px; background: var(--border); margin: 0 auto; }
        .study-tree .branch-item { display: flex; flex-direction: column; align-items: center; padding: 20px 10px 0; position: relative; }
        .study-tree .branch-item::before { content: ''; position: absolute; top: 0; right: 50%; width: 50%; height: 20px; border-top: 1px solid var(--border); }
        .study-tree .branch-item::after { content: ''; position: absolute; top: 0; left: 50%; width: 50%; height: 20px; border-top: 1px solid var(--border); border-left: 1px solid var(--border); }
        .study-tree .branch-item:first-child::before { border: none; }
        .study-tree .branch-item:last-child::after { border: none; }
        .study-tree .branch-item:only-child::before,
        .study-tree .branch-item:only-child::after { display: none; }
        @media (max-width: 760px) {
          .study-tree .branches { flex-direction: column; align-items: stretch; }
          .study-tree .branch-item { padding-top: 12px; }
          .study-tree .branch-item::before,
          .study-tree .branch-item::after,
          .study-tree .branches::before { display: none; }
        }
      `}</style>

      {/* Root node */}
      <div className="flex justify-center">
        <div className="glass card-glow max-w-md rounded-2xl px-6 py-4 text-center">
          <p className="font-mono text-xs text-muted" dir="ltr">
            {programNameEn}
          </p>
          <p className="mt-1 text-lg font-extrabold neon-text">{degree}</p>
          <p className="mt-1 text-sm tabular-nums text-muted">
            {totalCreditHours} ساعة معتمدة
          </p>
        </div>
      </div>

      {/* Branches */}
      <ul className="branches">
        {categories.map((cat, i) => {
          const color = BRANCH_COLORS[i % BRANCH_COLORS.length];
          const open = openIndex === i;
          return (
            <li key={cat.name} className="branch-item">
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                className="w-56 rounded-xl border p-3 text-start transition"
                style={{
                  borderColor: open ? color : "var(--border)",
                  backgroundColor: open
                    ? `color-mix(in srgb, ${color} 12%, transparent)`
                    : "var(--surface)",
                  boxShadow: open ? `0 0 24px -12px ${color}` : "none",
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold">{cat.name}</span>
                  <span
                    className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`, color }}
                  >
                    {cat.creditHours} س
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {cat.courses.length} مادة {open ? "▲" : "▼"}
                </p>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Leaves of the open branch */}
      {openIndex !== null && categories[openIndex] && (
        <div
          className="mx-auto mt-2 max-w-3xl rounded-2xl border p-4"
          style={{
            borderColor: BRANCH_COLORS[openIndex % BRANCH_COLORS.length],
            backgroundColor: `color-mix(in srgb, ${BRANCH_COLORS[openIndex % BRANCH_COLORS.length]} 6%, transparent)`,
          }}
        >
          {categories[openIndex].note && (
            <p className="mb-3 text-xs text-muted">{categories[openIndex].note}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {categories[openIndex].courses.map((c) => (
              <Link
                key={c.number}
                href={`/academic/${country}/${university}/course/${c.number}`}
                className="group rounded-lg border border-border bg-background px-3 py-2 text-xs transition hover:border-accent hover:shadow-[0_0_16px_-8px_var(--accent)]"
              >
                <span className="block font-mono text-[10px] text-muted" dir="ltr">
                  {c.number}
                </span>
                <span className="mt-0.5 block font-semibold group-hover:neon-text" dir="ltr">
                  {c.name}
                </span>
                <span className="mt-0.5 block tabular-nums text-muted">
                  {c.creditHours} ساعة
                  {c.mode ? ` · ${c.mode}` : ""}
                </span>
              </Link>
            ))}
            {categories[openIndex].courses.length === 0 && (
              <p className="text-sm text-muted">لا توجد مواد مضافة بعد لهذا القسم.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

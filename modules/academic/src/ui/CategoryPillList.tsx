import Link from "next/link";
import type { StudyPlanCategory } from "../study-plans";

export default function CategoryPillList({
  categories,
  country,
  university,
}: {
  categories: StudyPlanCategory[];
  country: string;
  university: string;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="space-y-8">
      {categories.map((cat) => (
        <div key={cat.name} className="overflow-hidden rounded-2xl border border-border">
          <div className="bg-background px-5 py-3 text-center">
            <h3 className="font-bold">{cat.name}</h3>
            <p className="mt-0.5 text-xs tabular-nums text-muted">
              {cat.creditHours} ساعة معتمدة{cat.note ? ` — ${cat.note}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 bg-surface/40 p-4">
            {cat.courses.map((c) => (
              <Link
                key={c.number}
                href={`/academic/${country}/${university}/course/${c.number}`}
                className="rounded-lg border border-border bg-background px-3.5 py-2 text-xs font-semibold transition hover:border-accent hover:text-accent"
                dir="ltr"
                title={`${c.number} — ${c.creditHours} ساعة`}
              >
                {c.name}
              </Link>
            ))}
            {cat.courses.length === 0 && (
              <p className="text-sm text-muted">لا توجد مواد مضافة بعد.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

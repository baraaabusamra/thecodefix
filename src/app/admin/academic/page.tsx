import type { Metadata } from "next";
import Link from "next/link";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { Forbidden } from "../_components/gates";
import { getCountry } from "@/lib/job-search";
import {
  getAcademicCountrySlugs,
  getUniversities,
  getSpecialization,
  type University,
} from "@/lib/academic-universities";
import { getStudyPlan, type StudyPlan } from "@/lib/academic-study-plans";

export const metadata: Metadata = {
  title: "الجانب الأكاديمي — خطط الدراسة",
  robots: { index: false, follow: false },
};

type Row = { specSlug: string; title: string; plan: StudyPlan | null };
type UniRow = { university: University; specs: Row[] };
type CountryRow = { slug: string; nameAr: string; universities: UniRow[] };

async function loadCountries(): Promise<CountryRow[]> {
  const countries: CountryRow[] = [];
  for (const countrySlug of getAcademicCountrySlugs()) {
    const country = getCountry(countrySlug);
    const universities: UniRow[] = [];
    for (const u of getUniversities(countrySlug)) {
      const specs: Row[] = [];
      for (const specSlug of u.specializations) {
        const spec = getSpecialization(specSlug);
        if (!spec) continue;
        const plan = await getStudyPlan(countrySlug, u.slug, specSlug, { includeUnpublished: true });
        specs.push({ specSlug, title: spec.title, plan });
      }
      universities.push({ university: u, specs });
    }
    countries.push({ slug: countrySlug, nameAr: country?.nameAr ?? countrySlug, universities });
  }
  return countries;
}

export default async function AdminAcademicPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "content:edit")) return <Forbidden role={access.role} />;

  const { saved, error } = await searchParams;
  const countries = await loadCountries();

  return (
    <div>
      <h1 className="text-2xl font-bold">🎓 الجانب الأكاديمي — خطط الدراسة</h1>
      <p className="mt-1 text-sm text-muted">
        أضف الخطة الدراسية الرسمية (المواد، الساعات، المتطلبات السابقة) لأي
        تخصص بجامعة، من غير ما تكتب كود. الخطط المنشأة من هون تظهر على الموقع
        فورًا.
      </p>

      {saved && (
        <p className="mt-4 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-500">
          ✓ تم {saved === "deleted" ? "الحذف" : "الحفظ"}.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          ✗ تأكد من اختيار جامعة وتخصص صحيحين.
        </p>
      )}

      <div className="mt-6 space-y-3">
        {countries.map((c) => (
          <details key={c.slug} className="rounded-xl border border-border bg-surface/50">
            <summary className="cursor-pointer px-4 py-3 font-semibold">
              {c.nameAr}{" "}
              <span className="text-sm font-normal text-muted">
                ({c.universities.length} جامعة)
              </span>
            </summary>
            <div className="divide-y divide-border border-t border-border">
              {c.universities.map((u) => (
                <details key={u.university.slug} className="px-4 py-2">
                  <summary className="cursor-pointer py-1.5 text-sm font-medium">
                    {u.university.name}{" "}
                    <span className="text-xs text-muted">
                      ({u.specs.length} تخصص)
                    </span>
                  </summary>
                  <ul className="divide-y divide-border/60 py-1">
                    {u.specs.map((row) => (
                      <li
                        key={row.specSlug}
                        className="flex items-center justify-between gap-2 py-2 text-sm"
                      >
                        <span className="flex items-center gap-2">
                          {row.title}
                          {row.plan?.origin === "file" && (
                            <span
                              className="rounded bg-border px-1.5 py-0.5 text-[10px] font-bold text-muted"
                              title="موثّقة من ملف بالكود — للقراءة فقط من هنا"
                            >
                              ملف
                            </span>
                          )}
                          {row.plan?.origin === "db" && (
                            <span className="rounded bg-brand-purple/15 px-1.5 py-0.5 text-[10px] font-bold text-brand-purple">
                              DB
                            </span>
                          )}
                          {!row.plan && (
                            <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-500">
                              لا توجد خطة
                            </span>
                          )}
                        </span>
                        <Link
                          href={`/admin/academic/edit?country=${c.slug}&university=${u.university.slug}&specialization=${row.specSlug}`}
                          className="shrink-0 rounded-lg border border-border px-3 py-1 text-xs font-semibold transition hover:bg-surface"
                        >
                          {row.plan?.origin === "file"
                            ? "عرض"
                            : row.plan?.origin === "db"
                              ? "تحرير"
                              : "＋ إنشاء"}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

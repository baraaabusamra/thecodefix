import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCountry } from "@/lib/job-search";
import {
  getUniversity,
  getUniversities,
  getSpecialization,
  getAcademicCountrySlugs,
} from "@/lib/academic-universities";
import { getAcademicCourse } from "@/lib/academic";
import { getStudyPlan } from "@/lib/academic-study-plans";
import { BASE_KEYWORDS } from "@/lib/seo";

// Curated combinations only — a university that doesn't list a specialization
// must 404, not render it just because the slug exists somewhere globally.
export const dynamicParams = false;

export function generateStaticParams() {
  return getAcademicCountrySlugs().flatMap((country) =>
    getUniversities(country).flatMap((u) =>
      u.specializations.map((specialization) => ({
        country,
        university: u.slug,
        specialization,
      }))
    )
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string; university: string; specialization: string }>;
}): Promise<Metadata> {
  const { country: countrySlug, university: universitySlug, specialization: specializationSlug } =
    await params;
  const university = getUniversity(countrySlug, universitySlug);
  const specialization = getSpecialization(specializationSlug);
  if (!university || !specialization || !university.specializations.includes(specializationSlug)) {
    return {};
  }
  return {
    title: `مواد ${specialization.title} — ${university.name}`,
    description: `المواد الأساسية لتخصص ${specialization.title} في ${university.name}: ${specialization.description}`,
    keywords: [specialization.title, university.name, ...BASE_KEYWORDS],
    alternates: {
      canonical: `/academic/${countrySlug}/${universitySlug}/${specializationSlug}`,
    },
  };
}

export default async function AcademicSpecializationPage({
  params,
}: {
  params: Promise<{ country: string; university: string; specialization: string }>;
}) {
  const { country: countrySlug, university: universitySlug, specialization: specializationSlug } =
    await params;
  const country = getCountry(countrySlug);
  const university = getUniversity(countrySlug, universitySlug);
  const specialization = getSpecialization(specializationSlug);
  if (
    !country ||
    !university ||
    !specialization ||
    !university.specializations.includes(specializationSlug)
  ) {
    notFound();
  }

  const courses = specialization.courseSlugs
    .map((slug) => getAcademicCourse(slug))
    .filter((c): c is NonNullable<typeof c> => c !== null);

  const studyPlan = getStudyPlan(countrySlug, universitySlug, specializationSlug);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <nav className="mb-4 text-sm text-muted">
        <Link href="/academic" className="hover:text-foreground">
          الجانب الأكاديمي
        </Link>
        {" / "}
        <Link href={`/academic/${countrySlug}`} className="hover:text-foreground">
          {country.nameAr}
        </Link>
        {" / "}
        <Link
          href={`/academic/${countrySlug}/${universitySlug}`}
          className="hover:text-foreground"
        >
          {university.name}
        </Link>
        {" / "}
        {specialization.title}
      </nav>

      <h1 className="text-3xl font-extrabold md:text-4xl">
        {specialization.title}
      </h1>
      <p className="mt-2 text-muted">
        {university.name} — {specialization.description}
      </p>

      {studyPlan && (
        <section className="mt-10">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-xl font-bold">الخطة الدراسية الرسمية</h2>
            <span className="text-sm tabular-nums text-muted">
              {studyPlan.totalCreditHours} ساعة معتمدة — {studyPlan.degree}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            منقولة عن {studyPlan.source}، بتاريخ {studyPlan.sourceDate} — البرنامج الرسمي:{" "}
            <span dir="ltr">{studyPlan.programNameEn}</span>. الخطط الدراسية بتتغيّر من فصل لفصل،
            تأكد من آخر نسخة عبر بوابة تسجيل الجامعة قبل ما تبني عليها قرار.
          </p>

          <div className="mt-4 space-y-6">
            {studyPlan.categories.map((cat) => {
              const table = (
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-surface text-xs text-muted">
                      <tr>
                        <th className="px-3 py-2 text-start">رقم المادة</th>
                        <th className="px-3 py-2 text-start">اسم المادة</th>
                        <th className="px-3 py-2 text-start">الساعات</th>
                        <th className="px-3 py-2 text-start">المتطلب السابق</th>
                        <th className="px-3 py-2 text-start">النمط</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cat.courses.map((c) => (
                        <tr key={c.number} className="border-t border-border">
                          <td
                            className="whitespace-nowrap px-3 py-2 font-mono text-xs text-accent"
                            dir="ltr"
                          >
                            {c.number}
                          </td>
                          <td className="px-3 py-2" dir="ltr">
                            {c.name}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 tabular-nums">
                            {c.creditHours}
                          </td>
                          <td
                            className="whitespace-nowrap px-3 py-2 font-mono text-xs"
                            dir="ltr"
                          >
                            {c.prerequisite ?? "—"}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2 text-xs text-muted">
                            {c.mode ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );

              return (
                <div key={cat.name}>
                  <h3 className="font-semibold">
                    {cat.name}{" "}
                    <span className="font-normal tabular-nums text-muted">
                      ({cat.creditHours} ساعة)
                    </span>
                  </h3>
                  {cat.note && <p className="mt-1 text-xs text-muted">{cat.note}</p>}
                  <div className="mt-2">
                    {cat.courses.length > 15 ? (
                      <details>
                        <summary className="cursor-pointer text-sm text-accent hover:underline">
                          عرض القائمة الكاملة ({cat.courses.length} مادة)
                        </summary>
                        <div className="mt-2">{table}</div>
                      </details>
                    ) : (
                      table
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <div className="mt-8 space-y-4">
        {studyPlan && (
          <h2 className="text-xl font-bold">دليل مرافق لأهم مواد التخصص</h2>
        )}
        {courses.map((c) => (
          <Link
            key={c.slug}
            href={`/academic/courses/${c.slug}`}
            className="group glass card-glow flex items-center gap-4 rounded-2xl p-5"
          >
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl"
              style={{
                backgroundColor: `color-mix(in srgb, ${c.color} 20%, transparent)`,
                boxShadow: `0 0 28px -12px ${c.color}`,
              }}
            >
              {c.icon}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold group-hover:neon-text">{c.title}</h2>
              <p className="mt-1 text-sm text-muted">{c.description}</p>
            </div>
            <span style={{ color: c.color }}>←</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

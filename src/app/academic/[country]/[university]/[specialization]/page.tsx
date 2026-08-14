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
import { splitCategories, buildPrerequisiteGraph } from "@/lib/prerequisite-graph";
import { BASE_KEYWORDS } from "@/lib/seo";
import PrerequisiteFlowchart from "@/components/academic/PrerequisiteFlowchart";
import CategoryPillList from "@/components/academic/CategoryPillList";

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

  const studyPlan = await getStudyPlan(countrySlug, universitySlug, specializationSlug);

  // The generic course guide is a fallback only — once a real, sourced study
  // plan exists for this combo, it fully replaces it (no "alternative"
  // courses shown next to the real curriculum).
  const fallbackCourses = studyPlan
    ? []
    : specialization.courseSlugs
        .map((slug) => getAcademicCourse(slug))
        .filter((c): c is NonNullable<typeof c> => c !== null);

  const flow = studyPlan ? buildPrerequisiteGraph(studyPlan.categories) : null;
  const otherCategories = studyPlan
    ? [...splitCategories(studyPlan.categories).other, ...(flow?.standalone ?? [])]
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-8">
      <nav className="mb-6 text-sm text-muted">
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

      {/* Hero */}
      <div className="border-b border-border pb-8">
        <p className="text-sm font-semibold text-accent">{university.name}</p>
        <h1 className="mt-2 text-4xl font-extrabold md:text-6xl">
          {specialization.title}
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-muted">
          {specialization.description}
        </p>
        {studyPlan && (
          <p className="mt-4 text-sm text-muted">
            منقولة عن <span className="font-semibold text-foreground">{studyPlan.source}</span>
            {studyPlan.sourceDate ? `، بتاريخ ${studyPlan.sourceDate}` : ""} — البرنامج
            الرسمي: <span dir="ltr">{studyPlan.programNameEn}</span>. الخطط الدراسية
            بتتغيّر من فصل لفصل، تأكد من آخر نسخة عبر بوابة تسجيل الجامعة قبل ما
            تبني عليها قرار.
          </p>
        )}
      </div>

      {studyPlan && flow ? (
        <>
          {flow.graph.nodes.length > 0 && (
            <section className="py-10">
              <h2 className="mb-1 text-center text-xl font-bold">
                مسار المواد الإجبارية
              </h2>
              <p className="mb-8 text-center text-sm text-muted">
                كل صندوق مادة — اكبس عليه لتفتح صفحتها. الأسهم بتوريك أي مادة
                لازم تاخدها قبل الثانية.
              </p>
              <PrerequisiteFlowchart
                graph={flow.graph}
                country={countrySlug}
                university={universitySlug}
                title={specialization.title}
              />
            </section>
          )}

          {otherCategories.length > 0 && (
            <section className="border-t border-border py-10">
              <h2 className="mb-8 text-center text-xl font-bold">باقي المواد</h2>
              <CategoryPillList
                categories={otherCategories}
                country={countrySlug}
                university={universitySlug}
              />
            </section>
          )}

          {studyPlan.generalNote && (
            <p className="mx-auto max-w-2xl pb-6 text-center text-xs text-muted">
              ملاحظة: {studyPlan.generalNote}
            </p>
          )}
        </>
      ) : (
        <div className="mt-8 space-y-4">
          <p className="text-sm text-muted">
            ما في لسا خطة دراسية رسمية موثّقة لهاد التخصص بهاي الجامعة — هاي مواد
            استرشادية عامة لحد ما نضيفها.
          </p>
          {fallbackCourses.map((c) => (
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
      )}
    </div>
  );
}

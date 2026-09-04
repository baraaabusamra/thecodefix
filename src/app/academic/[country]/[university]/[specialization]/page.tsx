import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getUniversities,
  getAcademicCountrySlugs,
} from "@/lib/academic-universities";
import { splitCategories, buildPrerequisiteGraph } from "@/lib/prerequisite-graph";
import { BASE_KEYWORDS } from "@/lib/seo";
import { getAcademicPageState, NOINDEX_FOLLOW } from "@/lib/academic-indexability";
import PrerequisiteFlowchart from "@/components/academic/PrerequisiteFlowchart";
import CategoryPillList from "@/components/academic/CategoryPillList";
import Breadcrumbs from "@/components/Breadcrumbs";

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
  const state = await getAcademicPageState(countrySlug, universitySlug, specializationSlug);
  if (state.kind === "not-found") return {};
  const { university, specialization } = state.route;
  return {
    title: `مواد ${specialization.title} — ${university.name}`,
    description: `المواد الأساسية لتخصص ${specialization.title} في ${university.name}: ${specialization.description}`,
    keywords: [specialization.title, university.name, ...BASE_KEYWORDS],
    alternates: {
      canonical: `/academic/${countrySlug}/${universitySlug}/${specializationSlug}`,
    },
    // The Quality Gate's exact indexability decision — must never diverge
    // from the page-rendering branch below or the sitemap filter, all three
    // read state.indexable / isStudyPlanPublishable() from the same source.
    robots: state.indexable ? undefined : NOINDEX_FOLLOW,
  };
}

export default async function AcademicSpecializationPage({
  params,
}: {
  params: Promise<{ country: string; university: string; specialization: string }>;
}) {
  const { country: countrySlug, university: universitySlug, specialization: specializationSlug } =
    await params;
  const state = await getAcademicPageState(countrySlug, universitySlug, specializationSlug);
  if (state.kind === "not-found") notFound();
  const { route, plan: studyPlan, indexable } = state;
  const { country, university, specialization } = route;

  const flow = indexable && studyPlan ? buildPrerequisiteGraph(studyPlan.categories) : null;
  const otherCategories =
    indexable && studyPlan
      ? [...splitCategories(studyPlan.categories).other, ...(flow?.standalone ?? [])]
      : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 md:px-8">
      <Breadcrumbs
        items={[
          { name: "الجانب الأكاديمي", href: "/academic" },
          { name: country.nameAr, href: `/academic/${countrySlug}` },
          { name: university.name, href: `/academic/${countrySlug}/${universitySlug}` },
          {
            name: specialization.title,
            href: `/academic/${countrySlug}/${universitySlug}/${specializationSlug}`,
          },
        ]}
      />

      {/* Hero — genuinely verified facts only: the real university name and
          the real (if generic, sitewide) specialization taxonomy. Neither
          claims to be this university's specific curriculum. */}
      <div className="border-b border-border pb-8">
        <p className="text-sm font-semibold text-accent">{university.name}</p>
        <h1 className="mt-2 text-4xl font-extrabold md:text-6xl">
          {specialization.title}
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-muted">
          {specialization.description}
        </p>
        {indexable && studyPlan && (
          <p className="mt-4 text-sm text-muted">
            منقولة عن <span className="font-semibold text-foreground">{studyPlan.source}</span>
            {studyPlan.sourceDate ? `، بتاريخ ${studyPlan.sourceDate}` : ""} — البرنامج
            الرسمي: <span dir="ltr">{studyPlan.programNameEn}</span>. الخطط الدراسية
            بتتغيّر من فصل لفصل، تأكد من آخر نسخة عبر بوابة تسجيل الجامعة قبل ما
            تبني عليها قرار.
          </p>
        )}
      </div>

      {indexable && studyPlan && flow ? (
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
        // No generic course list here on purpose — src/lib/academic-universities.ts's
        // SPECIALIZATIONS[].courseSlugs is the SAME shared list for every
        // university offering this specialization, which is exactly what
        // made these 1038 pages near-duplicates of each other (see
        // reports/seo-spam-audit-2026-08-28/risk-findings.csv RF-01). This
        // page stays a real, honest HTTP 200 (not a redirect or 404 — the
        // combination itself is real) but is marked noindex via
        // generateMetadata until a genuine, sourced study plan exists.
        <div className="mt-8 max-w-2xl space-y-4">
          <p className="text-sm text-muted">
            ما في لسا خطة دراسية رسمية موثّقة ومنشورة لتخصص{" "}
            <span className="text-foreground">{specialization.title}</span> في{" "}
            <span className="text-foreground">{university.name}</span>. لما تتوفر
            خطة موثّقة من مصدر رسمي، رح تُنشر هون كاملة بمصدرها وتاريخها.
          </p>
          <Link
            href={`/academic/${countrySlug}/${universitySlug}`}
            className="inline-block text-sm font-semibold text-accent hover:underline"
          >
            ← عرض التخصصات المتوفّرة بجامعة {university.name}
          </Link>
        </div>
      )}
    </div>
  );
}

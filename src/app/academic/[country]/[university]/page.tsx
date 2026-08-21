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
import { BASE_KEYWORDS } from "@/lib/seo";
import Breadcrumbs from "@/components/Breadcrumbs";

export function generateStaticParams() {
  return getAcademicCountrySlugs().flatMap((country) =>
    getUniversities(country).map((u) => ({ country, university: u.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string; university: string }>;
}): Promise<Metadata> {
  const { country: countrySlug, university: universitySlug } = await params;
  const university = getUniversity(countrySlug, universitySlug);
  if (!university) return {};
  return {
    title: `تخصصات ${university.name} — الجانب الأكاديمي`,
    description: `تخصصات تكنولوجيا المعلومات المتوفّرة في ${university.name}، ودليل عملي مرافق لمواد كل تخصص.`,
    keywords: [university.name, `${university.name} تخصصات`, ...BASE_KEYWORDS],
    alternates: { canonical: `/academic/${countrySlug}/${universitySlug}` },
  };
}

export default async function AcademicUniversityPage({
  params,
}: {
  params: Promise<{ country: string; university: string }>;
}) {
  const { country: countrySlug, university: universitySlug } = await params;
  const country = getCountry(countrySlug);
  const university = getUniversity(countrySlug, universitySlug);
  if (!country || !university) notFound();

  const specializations = university.specializations
    .map((slug) => getSpecialization(slug))
    .filter((s): s is NonNullable<typeof s> => s !== null);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { name: "الرئيسية", href: "/" },
          { name: "الجانب الأكاديمي", href: "/academic" },
          { name: country.nameAr, href: `/academic/${countrySlug}` },
          { name: university.name, href: `/academic/${countrySlug}/${universitySlug}` },
        ]}
      />

      <h1 className="text-3xl font-extrabold md:text-4xl">{university.name}</h1>
      {university.city && (
        <p className="mt-1 text-muted">📍 {university.city}، {country.nameAr}</p>
      )}
      <p className="mt-3 text-sm text-muted">
        أسماء التخصصات موثّقة من مصادر الجامعة والجهات الرسمية، بس المنهج
        الدقيق والساعات المعتمدة وشروط القبول بتختلف وبتتحدّث — راجع الموقع
        الرسمي للجامعة قبل التقديم.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {specializations.map((s) => (
          <Link
            key={s.slug}
            href={`/academic/${countrySlug}/${universitySlug}/${s.slug}`}
            className="glass card-glow rounded-2xl p-5"
          >
            <h2 className="font-bold hover:neon-text">{s.title}</h2>
            <p className="mt-2 text-sm text-muted">{s.description}</p>
            <p className="mt-2 text-xs text-muted">{s.courseSlugs.length} مادة</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

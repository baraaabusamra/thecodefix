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

      <div className="mt-8 space-y-4">
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

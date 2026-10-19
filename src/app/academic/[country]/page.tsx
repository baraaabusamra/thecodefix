import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCountry } from "@/lib/job-search";
import CountryFlag from "@/components/CountryFlag";
import {
  getUniversities,
  getAcademicCountrySlugs,
} from "@/lib/academic-universities";
import { BASE_KEYWORDS } from "@/lib/seo";
import { isCountryIndexable, NOINDEX_FOLLOW } from "@/lib/academic-indexability";
import Breadcrumbs from "@/components/Breadcrumbs";

export function generateStaticParams() {
  return getAcademicCountrySlugs().map((slug) => ({ country: slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>;
}): Promise<Metadata> {
  const { country: countrySlug } = await params;
  const country = getCountry(countrySlug);
  if (!country) return {};
  return {
    title: `جامعات ${country.nameAr} — الجانب الأكاديمي`,
    description: `اختر جامعتك في ${country.nameAr} لتصفّح تخصصات تكنولوجيا المعلومات ومواد كل تخصص.`,
    keywords: [
      `جامعات ${country.nameAr}`,
      `جامعات ${country.nameAr} علوم حاسوب`,
      ...BASE_KEYWORDS,
    ],
    alternates: { canonical: `/academic/${countrySlug}` },
    // A country whose universities have no published study plan is only a
    // list of names: crawlable, but not indexed (see isCountryIndexable).
    ...((await isCountryIndexable(countrySlug)) ? {} : { robots: NOINDEX_FOLLOW }),
  };
}

export default async function AcademicCountryPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country: countrySlug } = await params;
  const country = getCountry(countrySlug);
  if (!country) notFound();

  const universities = getUniversities(countrySlug);
  if (universities.length === 0) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs
        items={[
          { name: "الرئيسية", href: "/" },
          { name: "الجانب الأكاديمي", href: "/academic" },
          { name: country.nameAr, href: `/academic/${countrySlug}` },
        ]}
      />

      <h1 className="text-3xl font-extrabold md:text-4xl">
        <CountryFlag country={country} className="text-3xl align-middle" /> جامعات{" "}
        <span className="neon-text-animated">{country.nameAr}</span>
      </h1>
      <p className="mt-2 text-muted">
        اختر جامعتك لتصفّح تخصصات تكنولوجيا المعلومات المتوفّرة فيها.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {universities.map((u) => (
          <Link
            key={u.slug}
            href={`/academic/${countrySlug}/${u.slug}`}
            className="glass card-glow rounded-2xl p-5"
          >
            <h2 className="font-bold hover:neon-text">{u.name}</h2>
            {u.city && <p className="mt-1 text-xs text-muted">📍 {u.city}</p>}
            <p className="mt-2 text-xs text-muted">
              {u.specializations.length} تخصص متاح
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}

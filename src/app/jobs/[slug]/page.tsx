import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getJob, getJobs } from "@/lib/jobs";
import { COUNTRIES, getCountry, type Country } from "@/lib/job-search";
import JobSearchLinks from "@/components/JobSearchLinks";
import JoobleListings from "@/components/JoobleListings";
import JobAlertSignup from "@/components/JobAlertSignup";
import JsonLd from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";
import { BASE_KEYWORDS } from "@/lib/seo";

// This segment serves two page types: country search pages (/jobs/jordan …)
// and curated job postings (/jobs/frontend-react-riyadh). Countries resolve
// first — curated JSON files must never use a country slug.

// ISR: regenerate every 6h so Jooble listings (when the key is set) stay
// fresh while pages remain statically served.
export const revalidate = 21600;
export function generateStaticParams() {
  return [
    ...COUNTRIES.map((c) => ({ slug: c.slug })),
    ...getJobs().map((j) => ({ slug: j.slug })),
  ];
}

function countryTitle(country: Country): string {
  return country.slug === "remote"
    ? "وظائف برمجة عن بُعد"
    : `وظائف برمجة في ${country.nameAr}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;

  const country = getCountry(slug);
  if (country) {
    const title = countryTitle(country);
    const description =
      country.slug === "remote"
        ? "ابحث عن وظائف برمجة عن بُعد: روابط بحث جاهزة على Google Jobs و LinkedIn وأشهر لوحات العمل عن بُعد، مفلترة حسب تخصصك."
        : `ابحث عن وظائف مبرمجين ومطورين في ${country.nameAr}: روابط بحث جاهزة على Google Jobs و LinkedIn وبيت.كوم مفلترة حسب تخصصك — فرونت إند، باك إند، موبايل وأكثر.`;
    return {
      title,
      description,
      keywords: [
        title,
        `وظائف مبرمجين ${country.nameAr}`,
        `وظائف مطورين ${country.nameAr}`,
        `فرص عمل تقنية ${country.nameAr}`,
        "وظائف برمجة",
        ...BASE_KEYWORDS,
      ],
      alternates: { canonical: `/jobs/${slug}` },
      openGraph: { title, description, url: `/jobs/${slug}` },
    };
  }

  const job = getJob(slug);
  if (!job) return {};
  return {
    title: `${job.title} — ${job.company}`,
    description: job.description.slice(0, 155),
    keywords: [
      `وظيفة ${job.title}`,
      `${job.title} ${job.company}`,
      "وظائف برمجة",
      "فرص عمل تقنية",
    ],
    alternates: { canonical: `/jobs/${slug}` },
    openGraph: {
      title: `${job.title} — ${job.company}`,
      description: job.description.slice(0, 155),
      url: `/jobs/${slug}`,
      type: "article",
    },
  };
}

function CountryJobsPage({ country }: { country: Country }) {
  const title = countryTitle(country);
  const others = COUNTRIES.filter((c) => c.slug !== country.slug);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "لوحة الوظائف", item: `${SITE_URL}/jobs` },
            { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/jobs/${country.slug}` },
          ],
        }}
      />

      <nav className="mb-4 text-sm text-muted">
        <Link href="/jobs" className="hover:text-foreground">
          لوحة الوظائف
        </Link>
      </nav>

      <h1 className="text-4xl font-extrabold">
        {country.flag} وظائف برمجة{" "}
        <span className="neon-text-animated">
          {country.slug === "remote" ? "عن بُعد" : `في ${country.nameAr}`}
        </span>
      </h1>
      <p className="mt-2 leading-relaxed text-muted">
        {country.slug === "remote"
          ? "روابط بحث جاهزة تفتح لك أفضل مصادر العمل عن بُعد مفلترة على تخصصك — اختر تخصصك واضغط على المصدر، والتقديم يكون مباشرة عند الجهة المعلنة."
          : `روابط بحث جاهزة تفتح لك أشهر محركات التوظيف مفلترة مسبقًا على ${country.nameAr} وتخصصك — اختر تخصصك واضغط على المصدر، والتقديم يكون مباشرة عند الجهة المعلنة.`}
      </p>

      <div className="mt-8">
        <JoobleListings country={country} mode="jobs" />
        <div className="mb-8">
          <JobAlertSignup country={country.slug} />
        </div>
        <h2 className="mb-1 text-2xl font-bold">ابحث بنفسك حسب تخصصك</h2>
        <p className="mb-4 text-sm text-muted">
          روابط تفتح البحث جاهزًا على أشهر محركات التوظيف.
        </p>
        <JobSearchLinks countrySlug={country.slug} mode="jobs" />
      </div>

      <Link
        href={`/training/${country.slug}`}
        className="mt-8 block rounded-2xl border border-brand-cyan/30 bg-brand-cyan/5 p-5 text-center"
      >
        <span className="font-bold text-brand-cyan">
          🎓 لسّا بتتعلم؟ شوف فرص التدريب{" "}
          {country.slug === "remote" ? "عن بُعد" : `في ${country.nameAr}`} ←
        </span>
      </Link>

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-bold">نصائح قبل ما تقدّم</h2>
        <ul className="list-disc space-y-2 ps-6 text-sm leading-relaxed text-muted">
          <li>
            جهّز سيرة ذاتية بصيغة PDF بالإنجليزية — معظم أنظمة الفرز الآلي (ATS)
            لا تقرأ العربية جيدًا.
          </li>
          <li>
            أضف روابط مشاريعك على GitHub — مشروع واحد مكتمل أقوى من عشر شهادات.
          </li>
          <li>
            فعّل التنبيهات (Job Alerts) على LinkedIn وبيت.كوم بنفس كلمات البحث
            حتى توصلك الوظائف الجديدة أولًا بأول.
          </li>
          <li>
            مش لاقي عندك الخبرة المطلوبة؟ ابدأ من{" "}
            <Link href="/roadmaps" className="text-brand-purple">
              خرائط التعلم
            </Link>{" "}
            وكمّل مسارك على{" "}
            <Link href="/learn" className="text-brand-purple">
              الدروس
            </Link>
            .
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-bold">دول أخرى</h2>
        <div className="flex flex-wrap gap-2">
          {others.map((c) => (
            <Link
              key={c.slug}
              href={`/jobs/${c.slug}`}
              className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-muted hover:text-foreground"
            >
              {c.flag} {c.nameAr}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const country = getCountry(slug);
  if (country) return <CountryJobsPage country={country} />;

  const job = getJob(slug);
  if (!job) notFound();

  const employmentTypeMap: Record<string, string> = {
    "دوام كامل": "FULL_TIME",
    "دوام جزئي": "PART_TIME",
    "تدريب": "INTERN",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "JobPosting",
          title: job.title,
          description: job.description,
          datePosted: job.postedDate,
          employmentType: employmentTypeMap[job.type] ?? "OTHER",
          inLanguage: "ar",
          hiringOrganization: {
            "@type": "Organization",
            name: job.company,
          },
          jobLocation: {
            "@type": "Place",
            address: {
              "@type": "PostalAddress",
              addressLocality: job.location,
              ...(job.country ? { addressCountry: job.country } : {}),
            },
          },
          ...(job.remote ? { jobLocationType: "TELECOMMUTE" } : {}),
          url: `${SITE_URL}/jobs/${slug}`,
        }}
      />

      <nav className="mb-4 text-sm text-muted">
        <Link href="/jobs" className="hover:text-foreground">لوحة الوظائف</Link>
      </nav>

      <h1 className="text-3xl font-bold">{job.title}</h1>
      <p className="mt-1 text-muted">
        {job.company} · {job.location} · {job.type}
        {job.remote ? " · عن بُعد" : ""}
      </p>
      {job.salary && (
        <p className="mt-2 font-semibold text-brand-cyan">💰 {job.salary}</p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {job.tags.map((t) => (
          <span
            key={t}
            className="rounded-lg border border-border bg-surface px-3 py-1 text-sm text-muted"
          >
            {t}
          </span>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="mb-2 text-xl font-bold">الوصف</h2>
        <p className="leading-relaxed text-muted">{job.description}</p>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-xl font-bold">المتطلّبات</h2>
        <ul className="list-disc space-y-1 ps-6 text-muted">
          {job.requirements.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </section>

      <a
        href={job.applyUrl}
        className="mt-8 inline-block rounded-xl bg-brand-purple px-6 py-3 font-semibold text-white neon-glow"
      >
        قدّم الآن →
      </a>
    </div>
  );
}

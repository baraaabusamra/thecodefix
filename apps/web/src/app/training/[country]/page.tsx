import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { COUNTRIES, getCountry, type Country } from "@tcf/jobs/search";
import JobSearchLinks from "@tcf/jobs/ui/JobSearchLinks";
import JoobleListings from "@tcf/jobs/ui/JoobleListings";
import CountryFlag from "@tcf/ui/ui/CountryFlag";
import JsonLd from "@tcf/ui/ui/JsonLd";
import { SITE_URL } from "@tcf/core/site";
import { BASE_KEYWORDS } from "@tcf/content/seo";

export function generateStaticParams() {
  return COUNTRIES.map((c) => ({ country: c.slug }));
}

// ISR: regenerate every 6h so Jooble listings (when the key is set) stay
// fresh while pages remain statically served.
export const revalidate = 21600;

function pageTitle(country: Country): string {
  return country.slug === "remote"
    ? "فرص تدريب برمجة عن بُعد"
    : `فرص تدريب برمجة في ${country.nameAr}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>;
}): Promise<Metadata> {
  const { country: slug } = await params;
  const country = getCountry(slug);
  if (!country) return {};
  const title = pageTitle(country);
  const description =
    country.slug === "remote"
      ? "ابحث عن فرص تدريب (Internship) في البرمجة عن بُعد: روابط بحث جاهزة على LinkedIn و Google Jobs مفلترة على فرص التدريب وتخصصك."
      : `ابحث عن فرص تدريب (Internship) في البرمجة في ${country.nameAr}: روابط بحث جاهزة على LinkedIn و Google Jobs وبيت.كوم مفلترة على فرص التدريب وتخصصك.`;
  return {
    title,
    description,
    keywords: [
      title,
      `تدريب مبرمجين ${country.nameAr}`,
      `internship برمجة ${country.nameAr}`,
      "تدريب برمجة",
      "فرص تدريب للمبتدئين",
      ...BASE_KEYWORDS,
    ],
    alternates: { canonical: `/training/${slug}` },
    openGraph: { title, description, url: `/training/${slug}` },
  };
}

export default async function TrainingCountryPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country: slug } = await params;
  const country = getCountry(slug);
  if (!country) notFound();

  const title = pageTitle(country);
  const others = COUNTRIES.filter((c) => c.slug !== country.slug);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "فرص التدريب", item: `${SITE_URL}/training` },
            { "@type": "ListItem", position: 2, name: title, item: `${SITE_URL}/training/${country.slug}` },
          ],
        }}
      />

      <nav className="mb-4 text-sm text-muted">
        <Link href="/training" className="hover:text-foreground">
          فرص التدريب
        </Link>
      </nav>

      <h1 className="text-4xl font-extrabold">
        <CountryFlag country={country} className="text-3xl align-middle" /> فرص تدريب{" "}
        <span className="neon-text-animated">
          {country.slug === "remote" ? "عن بُعد" : `في ${country.nameAr}`}
        </span>
      </h1>
      <p className="mt-2 leading-relaxed text-muted">
        {country.slug === "remote"
          ? "روابط بحث جاهزة مفلترة على فرص التدريب (Internship) عن بُعد — اختر تخصصك واضغط على المصدر، والتقديم يكون مباشرة عند الجهة المعلنة."
          : `روابط بحث جاهزة مفلترة على فرص التدريب (Internship) في ${country.nameAr} — اختر تخصصك واضغط على المصدر، والتقديم يكون مباشرة عند الجهة المعلنة.`}
      </p>

      <div className="mt-8">
        <JoobleListings country={country} mode="training" />
        <h2 className="mb-1 text-2xl font-bold">ابحث بنفسك حسب تخصصك</h2>
        <p className="mb-4 text-sm text-muted">
          روابط تفتح البحث جاهزًا مفلترة على فرص التدريب.
        </p>
        <JobSearchLinks countrySlug={country.slug} mode="training" />
      </div>

      <Link
        href={`/jobs/${country.slug}`}
        className="mt-8 block rounded-2xl border border-brand-purple/30 bg-brand-purple/5 p-5 text-center"
      >
        <span className="font-bold text-brand-purple">
          💼 جاهز لسوق العمل؟ شوف الوظائف{" "}
          {country.slug === "remote" ? "عن بُعد" : `في ${country.nameAr}`} ←
        </span>
      </Link>

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-bold">كيف تزيد فرصتك بالقبول؟</h2>
        <ul className="list-disc space-y-2 ps-6 text-sm leading-relaxed text-muted">
          <li>
            أكمل مسارًا كاملًا على{" "}
            <Link href="/learn" className="text-brand-purple">
              الدروس
            </Link>{" "}
            واحصل على{" "}
            <Link href="/learn" className="text-brand-purple">
              شهادة إتمام
            </Link>{" "}
            تضيفها لسيرتك — تثبت جدّيتك حتى بدون خبرة.
          </li>
          <li>
            ابنِ مشروعين أو ثلاثة على GitHub — أغلب برامج التدريب تفرز على
            المشاريع لا على الشهادات الجامعية.
          </li>
          <li>
            قدّم حتى لو ما استوفيت كل الشروط — إعلانات التدريب تُكتب لمرشح
            مثالي نادرًا ما يكون موجودًا.
          </li>
          <li>
            تابع صفحات الشركات المحلية على LinkedIn — كثير من فرص التدريب
            تُنشر كمنشورات ولا تصل للوحات الوظائف.
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-bold">دول أخرى</h2>
        <div className="flex flex-wrap gap-2">
          {others.map((c) => (
            <Link
              key={c.slug}
              href={`/training/${c.slug}`}
              className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-muted hover:text-foreground"
            >
              <CountryFlag country={c} /> {c.nameAr}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

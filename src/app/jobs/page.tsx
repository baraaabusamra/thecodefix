import Link from "next/link";
import type { Metadata } from "next";
import { getJobs } from "@/lib/jobs";
import { COUNTRIES } from "@/lib/job-search";
import CountryFlag from "@/components/CountryFlag";
import { CONTACT_EMAIL } from "@/lib/site";
import { BASE_KEYWORDS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "لوحة الوظائف",
  description:
    "وظائف برمجية في العالم العربي: تطوير ويب، تطبيقات موبايل، وباك-إند — عن بُعد وداخل المكاتب، مع فرص للمبتدئين والخبراء.",
  keywords: [
    "وظائف برمجة",
    "وظائف مبرمجين",
    "وظائف تطوير ويب",
    "وظائف عن بعد برمجة",
    "وظائف فرونت اند",
    "فرص عمل برمجة في العالم العربي",
    ...BASE_KEYWORDS,
  ],
  alternates: { canonical: "/jobs" },
};

export default function JobsPage() {
  const jobs = getJobs();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold">
            لوحة <span className="neon-text-animated">الوظائف</span>
          </h1>
          <p className="text-muted">وظائف برمجية في العالم العربي.</p>
        </div>
        <a
          href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("نشر وظيفة")}`}
          className="btn-neon shrink-0 px-4 py-2 text-sm"
        >
          + انشر وظيفة
        </a>
      </div>

      <section className="mb-10">
        <h2 className="mb-1 text-2xl font-bold">ابحث حسب الدولة</h2>
        <p className="mb-4 text-sm text-muted">
          كل دولة لها صفحة مستقلة: روابط بحث جاهزة على Google Jobs و LinkedIn
          وبيت.كوم مفلترة على دولتك وتخصصك.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {COUNTRIES.map((c) => (
            <Link
              key={c.slug}
              href={`/jobs/${c.slug}`}
              className="glass card-glow rounded-2xl p-4 text-center"
            >
              <CountryFlag country={c} className="block text-2xl" />
              <span className="mt-1 block text-sm font-bold">{c.nameAr}</span>
            </Link>
          ))}
        </div>
        <Link
          href="/training"
          className="mt-4 block rounded-2xl border border-brand-cyan/30 bg-brand-cyan/5 p-4 text-center font-bold text-brand-cyan"
        >
          🎓 بتدور على تدريب مش وظيفة؟ قسم التدريب ←
        </Link>
      </section>

      <h2 className="mb-4 text-2xl font-bold">وظائف مختارة</h2>
      {jobs.length === 0 ? (
        <p className="text-muted">لا توجد وظائف حاليًا.</p>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Link
              key={job.slug}
              href={`/jobs/${job.slug}`}
              className="glass card-glow block rounded-2xl p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold hover:neon-text">{job.title}</h2>
                  <p className="text-sm text-muted">
                    {job.company} · {job.location}
                  </p>
                </div>
                {job.remote && (
                  <span className="shrink-0 rounded-full bg-brand-cyan/15 px-3 py-1 text-xs text-brand-cyan">
                    عن بُعد
                  </span>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-lg bg-background px-2 py-1 text-xs text-muted">
                  {job.type}
                </span>
                {job.tags.map((t) => (
                  <span
                    key={t}
                    className="rounded-lg bg-background px-2 py-1 text-xs text-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}

      <p className="mt-8 rounded-xl border border-border bg-surface p-4 text-center text-sm text-muted">
        شركتك تبحث عن مواهب؟ انشر وظيفتك ووصّلها لآلاف المطوّرين العرب.{" "}
        <a
          href="mailto:jobs@thecodefix.com?subject=نشر وظيفة"
          className="text-brand-purple"
        >
          تواصل معنا
        </a>
      </p>
    </div>
  );
}

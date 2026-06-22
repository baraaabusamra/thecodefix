import Link from "next/link";
import type { Metadata } from "next";
import { getJobs } from "@/lib/jobs";

export const metadata: Metadata = {
  title: "لوحة الوظائف",
  description:
    "وظائف برمجية في العالم العربي: تطوير ويب، موبايل، وباك-إند — عن بُعد وداخل المكاتب.",
  alternates: { canonical: "/jobs" },
};

export default function JobsPage() {
  const jobs = getJobs();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">لوحة الوظائف</h1>
          <p className="text-muted">وظائف برمجية في العالم العربي.</p>
        </div>
        <a
          href="mailto:jobs@thecodefix.com?subject=نشر وظيفة"
          className="shrink-0 rounded-xl bg-brand-purple px-4 py-2 text-sm font-semibold text-white"
        >
          + انشر وظيفة
        </a>
      </div>

      {jobs.length === 0 ? (
        <p className="text-muted">لا توجد وظائف حاليًا.</p>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => (
            <Link
              key={job.slug}
              href={`/jobs/${job.slug}`}
              className="block rounded-2xl border border-border bg-surface p-5 transition hover:neon-glow"
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

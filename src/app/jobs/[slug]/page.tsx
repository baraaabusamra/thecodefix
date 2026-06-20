import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getJob, getJobs } from "@/lib/jobs";
import JsonLd from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return getJobs().map((j) => ({ slug: j.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const job = getJob(slug);
  if (!job) return {};
  return {
    title: `${job.title} — ${job.company}`,
    description: job.description.slice(0, 155),
  };
}

export default async function JobPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
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
            address: { "@type": "PostalAddress", addressLocality: job.location },
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

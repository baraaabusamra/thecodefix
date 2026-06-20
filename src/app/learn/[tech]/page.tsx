import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTrack, getTracks, getLessons } from "@/lib/content";
import { hasQuiz } from "@/lib/quiz";
import JsonLd from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return getTracks().map((t) => ({ tech: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tech: string }>;
}): Promise<Metadata> {
  const { tech } = await params;
  const track = getTrack(tech);
  if (!track) return {};
  return { title: track.title, description: track.description };
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ tech: string }>;
}) {
  const { tech } = await params;
  const track = getTrack(tech);
  if (!track) notFound();
  const lessons = getLessons(tech);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Course",
          name: `${track.title} بالعربي`,
          description: track.description,
          url: `${SITE_URL}/learn/${tech}`,
          inLanguage: "ar",
          provider: {
            "@type": "Organization",
            name: "The Code Fix",
            url: SITE_URL,
          },
          hasCourseInstance: {
            "@type": "CourseInstance",
            courseMode: "online",
            courseWorkload: `PT${Math.max(lessons.length, 1)}H`,
          },
        }}
      />
      <div className="mb-8 flex items-center gap-4">
        <span className="text-5xl">{track.icon}</span>
        <div>
          <h1 className="text-3xl font-bold">{track.title}</h1>
          <p className="text-muted">{track.description}</p>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        {lessons.length > 0 && (
          <Link
            href={`/learn/${tech}/${lessons[0].slug}`}
            className="inline-block rounded-xl bg-brand-purple px-6 py-3 font-semibold text-white neon-glow"
          >
            ابدأ من الدرس الأول →
          </Link>
        )}
        {hasQuiz(tech) && (
          <Link
            href={`/quiz/${tech}`}
            className="inline-block rounded-xl border border-brand-cyan px-6 py-3 font-semibold text-brand-cyan"
          >
            🧠 اختبر نفسك واحصل على شهادة
          </Link>
        )}
      </div>

      <ol className="space-y-2">
        {lessons.map((l, i) => (
          <li key={l.slug}>
            <Link
              href={`/learn/${tech}/${l.slug}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition hover:neon-glow"
            >
              <span className="grid h-8 w-8 place-items-center rounded-full bg-brand-purple/15 text-sm font-bold text-brand-purple">
                {i + 1}
              </span>
              <div>
                <p className="font-semibold">{l.title}</p>
                <p className="text-sm text-muted">{l.description}</p>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

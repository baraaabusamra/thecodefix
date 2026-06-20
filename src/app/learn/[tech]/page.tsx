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
      {/* Colored heading (W3Schools-style) */}
      <p className="mb-1 text-sm font-bold" style={{ color: track.color }}>
        {track.icon} مسار تعليمي
      </p>
      <h1 className="text-4xl font-extrabold">
        تعلّم <span style={{ color: track.color }}>{track.title}</span>
      </h1>

      {/* Top Previous/Next bar */}
      <div className="mt-5 flex items-center justify-between gap-3">
        <Link
          href="/learn"
          className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold transition hover:neon-glow"
        >
          ❯ كل المسارات
        </Link>
        {lessons.length > 0 && (
          <Link
            href={`/learn/${tech}/${lessons[0].slug}`}
            style={{ backgroundColor: track.color }}
            className="rounded-full px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            ابدأ ❮
          </Link>
        )}
      </div>

      {/* Intro card */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-border">
        <div className="h-2" style={{ backgroundColor: track.color }} />
        <div className="p-6">
          <div className="mb-3 flex items-center gap-3">
            <span
              className="grid h-14 w-14 place-items-center rounded-2xl text-3xl"
              style={{ backgroundColor: `${track.color}22` }}
            >
              {track.icon}
            </span>
            <h2 className="text-2xl font-bold">تعلّم {track.title}</h2>
          </div>
          <p className="mb-5 text-muted">{track.description}</p>
          <div className="flex flex-wrap gap-3">
            {lessons.length > 0 && (
              <Link
                href={`/learn/${tech}/${lessons[0].slug}`}
                style={{ backgroundColor: track.color }}
                className="rounded-full px-6 py-3 font-bold text-white transition hover:opacity-90"
              >
                ابدأ التعلّم الآن ❮
              </Link>
            )}
            {hasQuiz(tech) && (
              <Link
                href={`/quiz/${tech}`}
                className="rounded-full border border-border bg-surface px-6 py-3 font-semibold transition hover:neon-glow"
              >
                🧠 احصل على شهادة
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Chapters */}
      <h2 className="mb-4 mt-10 text-xl font-bold">
        محتوى المسار ({lessons.length} درس)
      </h2>
      <ol className="space-y-2">
        {lessons.map((l, i) => (
          <li key={l.slug}>
            <Link
              href={`/learn/${tech}/${l.slug}`}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 transition hover:neon-glow"
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold"
                style={{ backgroundColor: `${track.color}22`, color: track.color }}
              >
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

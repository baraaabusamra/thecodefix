import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getTrack,
  getTracks,
  getLessons,
  getLesson,
  getAdjacentLessons,
  type LessonSummary,
} from "@/lib/content";
import { hasQuiz } from "@/lib/quiz";
import Sidebar from "@/components/Sidebar";
import Mdx from "@/components/Mdx";
import LessonComplete from "@/components/LessonComplete";
import JsonLd from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return getTracks().flatMap((t) =>
    getLessons(t.slug).map((l) => ({ tech: t.slug, lesson: l.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tech: string; lesson: string }>;
}): Promise<Metadata> {
  const { tech, lesson } = await params;
  const data = getLesson(tech, lesson);
  if (!data) return {};
  return {
    title: data.title,
    description: data.description,
    keywords: data.keywords,
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ tech: string; lesson: string }>;
}) {
  const { tech, lesson } = await params;
  const track = getTrack(tech);
  const data = getLesson(tech, lesson);
  if (!track || !data) notFound();

  const lessons = getLessons(tech);
  const { prev, next } = getAdjacentLessons(tech, lesson);

  return (
    <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[260px_1fr]">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: data.title,
          description: data.description,
          url: `${SITE_URL}/learn/${tech}/${lesson}`,
          inLanguage: "ar",
          learningResourceType: "lesson",
          isPartOf: { "@type": "Course", name: `${track.title} بالعربي` },
          keywords: data.keywords?.join(", "),
          provider: { "@type": "Organization", name: "The Code Fix", url: SITE_URL },
        }}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "المسارات", item: `${SITE_URL}/learn` },
            { "@type": "ListItem", position: 2, name: track.title, item: `${SITE_URL}/learn/${tech}` },
            { "@type": "ListItem", position: 3, name: data.title, item: `${SITE_URL}/learn/${tech}/${lesson}` },
          ],
        }}
      />
      <aside className="md:sticky md:top-20 md:h-fit">
        <Sidebar track={tech} trackTitle={track.title} lessons={lessons} />
      </aside>

      <div className="min-w-0">
        <nav className="mb-3 text-sm text-muted">
          <Link href="/learn" className="hover:text-foreground">المسارات</Link>
          {" / "}
          <Link href={`/learn/${tech}`} className="hover:text-foreground">
            {track.title}
          </Link>
        </nav>

        {/* Colored tutorial heading (W3Schools-style) */}
        <p className="mb-1 text-sm font-bold" style={{ color: track.color }}>
          {track.icon} شرح {track.title}
        </p>
        <h1 className="mb-4 text-3xl font-bold">{data.title}</h1>

        {/* Top Previous/Next bar */}
        <PrevNext
          tech={tech}
          color={track.color}
          trackTitle={track.title}
          prev={prev}
          next={next}
          quiz={hasQuiz(tech)}
        />

        <div className="mt-6">
          <Mdx source={data.content} />
        </div>

        <div className="mt-12 flex justify-center border-t border-border pt-6">
          <LessonComplete track={tech} lesson={lesson} />
        </div>

        {/* Bottom Previous/Next bar */}
        <div className="mt-6">
          <PrevNext
            tech={tech}
            color={track.color}
            trackTitle={track.title}
            prev={prev}
            next={next}
            quiz={hasQuiz(tech)}
          />
        </div>
      </div>
    </div>
  );
}

function PrevNext({
  tech,
  color,
  trackTitle,
  prev,
  next,
  quiz,
}: {
  tech: string;
  color: string;
  trackTitle: string;
  prev: LessonSummary | null;
  next: LessonSummary | null;
  quiz: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      {prev ? (
        <Link
          href={`/learn/${tech}/${prev.slug}`}
          className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold transition hover:neon-glow"
        >
          ❯ السابق
        </Link>
      ) : (
        <Link
          href={`/learn/${tech}`}
          className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold transition hover:neon-glow"
        >
          ❯ {trackTitle}
        </Link>
      )}

      {next ? (
        <Link
          href={`/learn/${tech}/${next.slug}`}
          style={{ backgroundColor: color }}
          className="rounded-full px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          التالي ❮
        </Link>
      ) : quiz ? (
        <Link
          href={`/quiz/${tech}`}
          style={{ backgroundColor: color }}
          className="rounded-full px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          الاختبار ❮
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

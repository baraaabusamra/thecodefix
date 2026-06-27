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
import BookmarkButton from "@/components/BookmarkButton";
import ReadingProgress from "@/components/ReadingProgress";
import OnThisPage from "@/components/OnThisPage";
import JsonLd from "@/components/JsonLd";
import { SITE_URL } from "@/lib/site";

// Rough Arabic reading time (~180 words/min), minimum one minute.
function readingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}

export async function generateStaticParams() {
  const tracks = await getTracks();
  const all = await Promise.all(
    tracks.map(async (t) =>
      (await getLessons(t.slug)).map((l) => ({ tech: t.slug, lesson: l.slug }))
    )
  );
  return all.flat();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tech: string; lesson: string }>;
}): Promise<Metadata> {
  const { tech, lesson } = await params;
  const data = await getLesson(tech, lesson);
  if (!data) return {};
  const path = `/learn/${tech}/${lesson}`;
  return {
    title: data.title,
    description: data.description,
    keywords: data.keywords,
    alternates: { canonical: path },
    openGraph: {
      title: data.title,
      description: data.description,
      url: path,
      type: "article",
    },
  };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ tech: string; lesson: string }>;
}) {
  const { tech, lesson } = await params;
  const track = await getTrack(tech);
  const data = await getLesson(tech, lesson);
  if (!track || !data) notFound();

  const lessons = await getLessons(tech);
  const { prev, next } = await getAdjacentLessons(tech, lesson);
  const minutes = readingMinutes(data.content);
  const position = lessons.findIndex((l) => l.slug === lesson) + 1;

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_220px]">
      <ReadingProgress />
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
        <h1 className="mb-3 text-3xl font-bold">{data.title}</h1>

        {/* Meta row: position, reading time, bookmark */}
        <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
          {position > 0 && (
            <span>
              الدرس {position} من {lessons.length}
            </span>
          )}
          <span>· ⏱ {minutes} دقائق قراءة</span>
          <span className="ms-auto">
            <BookmarkButton
              track={tech}
              slug={lesson}
              title={data.title}
              trackTitle={track.title}
            />
          </span>
        </div>

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

      {/* On this page (xl+) */}
      <aside className="hidden xl:block">
        <div className="sticky top-24">
          <OnThisPage />
        </div>
      </aside>
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

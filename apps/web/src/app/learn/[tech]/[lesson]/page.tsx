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
} from "@tcf/content/tracks";
import { hasTrackAssessment } from "@tcf/assessment/quiz-bank";
import { isRequiredLesson } from "@tcf/assessment/requirements";
import { isAuthEnabled } from "@tcf/core/flags";
import Sidebar from "@tcf/learning/ui/Sidebar";
import Mdx from "@tcf/learning/ui/Mdx";
import LessonComplete from "@tcf/learning/ui/LessonComplete";
import LessonQuiz from "@tcf/assessment/ui/LessonQuiz";
import BookmarkButton from "@tcf/learning/ui/BookmarkButton";
import ShareButton from "@tcf/ui/ui/ShareButton";
import TextSizeControl from "@tcf/ui/ui/TextSizeControl";
import PrintButton from "@tcf/ui/ui/PrintButton";
import LessonFeedback from "@tcf/learning/ui/LessonFeedback";
import ReadingProgress from "@tcf/learning/ui/ReadingProgress";
import OnThisPage from "@tcf/learning/ui/OnThisPage";
import RecordVisit from "@tcf/learning/ui/RecordVisit";
import LessonKeyNav from "@tcf/learning/ui/LessonKeyNav";
import Breadcrumbs from "@tcf/ui/ui/Breadcrumbs";
import JsonLd from "@tcf/ui/ui/JsonLd";
import { SITE_URL } from "@tcf/core/site";
import { TRACK_RESOURCES } from "@tcf/content/track-resources";
import { lessonKeywords } from "@tcf/content/seo";
import { onColor } from "@tcf/core/color";
import lessonDates from "@tcf/content/lesson-dates";

// "tech/lesson" -> last git-commit date, regenerated via `npm run dates:generate`
const LESSON_DATES = lessonDates as Record<string, string>;

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
  const [data, track] = await Promise.all([
    getLesson(tech, lesson),
    getTrack(tech),
  ]);
  if (!data) return {};
  const path = `/learn/${tech}/${lesson}`;
  // Lead the document <title> with the track name so the focus keyword sits at
  // the very START of the title (a Rank Math "keyword at the beginning" signal),
  // followed by "بالعربي" (the highest-intent Arabic qualifier) then the specific
  // lesson — e.g. "جافاسكريبت بالعربي: الدوال (Functions)". The visible H1 and
  // sidebar keep using the clean data.title untouched.
  const trackTitle = track?.title ?? "";
  const qualifiedTitle = trackTitle
    ? `${trackTitle} بالعربي: ${data.title}`
    : `${data.title} بالعربي`;
  // Keep the keyword-qualified form when it fits. If the track prefix would
  // push an otherwise clear lesson title past the SERP limit, use the clean
  // lesson title instead. Truly long titles provide an explicit seoTitle.
  const seoTitle =
    data.seoTitle ?? (qualifiedTitle.length <= 60 ? qualifiedTitle : data.title);
  return {
    // Use an absolute title so the global "%s | The Code Fix" suffix isn't
    // appended — the lesson title already carries the brand context via
    // "— <track> بالعربي", and the extra 15 chars pushed ~20% of titles past
    // the ~60-char SERP limit. Absolute keeps overflow near 3%.
    title: { absolute: seoTitle },
    description: data.description,
    keywords: lessonKeywords(trackTitle, data.title, data.keywords),
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
  const updated = LESSON_DATES[`${tech}/${lesson}`];

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[260px_1fr] xl:grid-cols-[280px_1fr_240px] 2xl:max-w-[1600px]">
      <ReadingProgress />
      <RecordVisit
        track={tech}
        slug={lesson}
        title={data.title}
        trackTitle={track.title}
      />
      <LessonKeyNav
        prev={prev ? `/learn/${tech}/${prev.slug}` : null}
        next={next ? `/learn/${tech}/${next.slug}` : null}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "LearningResource",
          name: data.title,
          description: data.description,
          url: `${SITE_URL}/learn/${tech}/${lesson}`,
          inLanguage: "ar",
          learningResourceType: "lesson",
          isAccessibleForFree: true,
          isPartOf: { "@type": "Course", name: `${track.title} بالعربي` },
          keywords: data.keywords?.join(", "),
          ...(updated && { dateModified: updated }),
          provider: { "@id": `${SITE_URL}/#organization` },
        }}
      />
      <aside className="md:sticky md:top-20 md:h-fit">
        {/* Phone: the full lesson list used to render above the lesson itself,
            pushing the content ~30 links down. Collapse it behind a disclosure
            so the lesson starts on the first screen. */}
        <details className="no-print rounded-xl border border-border bg-surface md:hidden">
          <summary className="cursor-pointer select-none px-4 py-3 font-bold">
            📚 دروس {track.title} ({lessons.length})
          </summary>
          <div className="max-h-[60vh] overflow-y-auto border-t border-border p-2">
            <Sidebar
              track={tech}
              trackTitle={track.title}
              lessons={lessons}
              hideTitle
            />
          </div>
        </details>
        <div className="hidden md:block">
          <Sidebar track={tech} trackTitle={track.title} lessons={lessons} />
        </div>
      </aside>

      <div className="min-w-0">
        <Breadcrumbs
          items={[
            { name: "المسارات", href: "/learn" },
            { name: track.title, href: `/learn/${tech}` },
            { name: data.title, href: `/learn/${tech}/${lesson}` },
          ]}
        />

        {/* Colored tutorial heading (W3Schools-style) */}
        <p className="mb-1 text-sm font-bold" style={{ color: track.color }}>
          {track.icon} شرح {track.title}
        </p>
        <h1 className="mb-3 text-3xl font-bold">{data.title}</h1>

        {/* Meta row: position, reading time, reader tools */}
        <div className="no-print mb-5 flex flex-wrap items-center gap-x-4 gap-y-3 text-sm text-muted">
          {position > 0 && (
            <span>
              الدرس {position} من {lessons.length}
            </span>
          )}
          <span>· ⏱ {minutes} دقائق قراءة</span>
          {updated && (
            <span>
              · 🗓 آخر تحديث:{" "}
              {new Date(updated).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          )}
          <span className="flex flex-wrap items-center gap-2 sm:ms-auto">
            <TextSizeControl />
            <PrintButton />
            <ShareButton title={data.title} />
            <BookmarkButton
              track={tech}
              slug={lesson}
              title={data.title}
              trackTitle={track.title}
            />
          </span>
        </div>

        {/* Phones/tablets get the table of contents as a disclosure here;
            xl+ keeps the sticky side rail below. */}
        <OnThisPage variant="collapsible" className="no-print mb-5 xl:hidden" />

        {/* Top Previous/Next bar */}
        <PrevNext
          tech={tech}
          color={track.color}
          trackTitle={track.title}
          prev={prev}
          next={next}
          quiz={hasTrackAssessment(tech)}
        />
        <div className="reading-column mt-6">
          <Mdx source={data.content} untrusted={data.source === "db"} />
        </div>

        {/* Branded illustration (the lesson's social card, generated at build).
            Gives the page an in-content image with a keyword-rich alt, and is
            lazy-loaded below the fold so it never becomes the LCP element. */}
        <figure className="no-print mt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/learn/${tech}/${lesson}/opengraph-image`}
            alt={`شرح ${data.title} — ${track.title} بالعربي`}
            width={1200}
            height={630}
            loading="lazy"
            decoding="async"
            className="w-full rounded-2xl border border-border"
          />
          <figcaption className="mt-2 text-center text-xs text-muted">
            {data.title} — {track.title} بالعربي · The Code Fix
          </figcaption>
        </figure>

        {TRACK_RESOURCES[tech] && (
          <p className="mt-8 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
            📚 لمزيد من التعمّق في {track.title}، راجِع{" "}
            <a
              href={TRACK_RESOURCES[tech].url}
              target="_blank"
              rel="noopener"
              className="font-semibold text-accent underline"
            >
              {TRACK_RESOURCES[tech].label}
            </a>
            .
          </p>
        )}

        <LessonFeedback track={tech} lesson={lesson} />

        <div className="no-print mt-12 flex justify-center border-t border-border pt-6">
          <LessonComplete track={tech} lesson={lesson} />
        </div>

        {isAuthEnabled() && isRequiredLesson(tech, lesson) && (
          <LessonQuiz track={tech} lesson={lesson} lessonTitle={data.title} />
        )}

        {/* Bottom Previous/Next bar */}
        <div className="mt-6">
          <PrevNext
            tech={tech}
            color={track.color}
            trackTitle={track.title}
            prev={prev}
            next={next}
            quiz={hasTrackAssessment(tech)}
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
          style={{ backgroundColor: color, color: onColor(color) }}
          className="rounded-full px-6 py-2.5 text-sm font-semibold transition hover:opacity-90"
        >
          التالي ❮
        </Link>
      ) : quiz ? (
        <Link
          href={`/quiz/${tech}`}
          style={{ backgroundColor: color, color: onColor(color) }}
          className="rounded-full px-6 py-2.5 text-sm font-semibold transition hover:opacity-90"
        >
          الاختبار ❮
        </Link>
      ) : (
        <span />
      )}
    </div>
  );
}

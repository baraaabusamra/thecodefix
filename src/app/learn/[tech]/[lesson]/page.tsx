import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getTrack,
  getTracks,
  getLessons,
  getLesson,
  getAdjacentLessons,
} from "@/lib/content";
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
        <nav className="mb-4 text-sm text-muted">
          <Link href="/learn" className="hover:text-foreground">المسارات</Link>
          {" / "}
          <Link href={`/learn/${tech}`} className="hover:text-foreground">
            {track.title}
          </Link>
        </nav>

        <h1 className="mb-6 text-3xl font-bold">{data.title}</h1>

        <Mdx source={data.content} />

        <div className="mt-12 flex justify-center border-t border-border pt-6">
          <LessonComplete track={tech} lesson={lesson} />
        </div>

        <div className="mt-6 flex justify-between gap-4">
          {prev ? (
            <Link
              href={`/learn/${tech}/${prev.slug}`}
              className="rounded-xl border border-border bg-surface px-4 py-3 transition hover:neon-glow"
            >
              → {prev.title}
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/learn/${tech}/${next.slug}`}
              className="rounded-xl border border-border bg-surface px-4 py-3 text-end transition hover:neon-glow"
            >
              {next.title} ←
            </Link>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}

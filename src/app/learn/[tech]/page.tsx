import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTrack, getTracks, getLessons } from "@/lib/content";
import { getPostsForTrack } from "@/lib/blog";
import { getRoadmapsForTrack } from "@/lib/roadmaps";
import { hasTrackAssessment } from "@/lib/quiz-bank";
import JsonLd from "@/components/JsonLd";
import Sidebar from "@/components/Sidebar";
import TrackProgress from "@/components/TrackProgress";
import TrackView from "@/components/TrackView";
import Breadcrumbs from "@/components/Breadcrumbs";
import { SITE_URL } from "@/lib/site";
import { trackKeywords } from "@/lib/seo";
import { onColor } from "@/lib/color";
import { REF_SECTIONS, getRefEntries } from "@/lib/reference";

export async function generateStaticParams() {
  return (await getTracks()).map((t) => ({ tech: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tech: string }>;
}): Promise<Metadata> {
  const { tech } = await params;
  const track = await getTrack(tech);
  if (!track) return {};
  return {
    title: track.title,
    description: track.description,
    keywords: trackKeywords(track.title),
    alternates: { canonical: `/learn/${tech}` },
    openGraph: {
      title: `تعلّم ${track.title} بالعربي`,
      description: track.description,
      url: `/learn/${tech}`,
      type: "website",
    },
  };
}

export default async function TrackPage({
  params,
}: {
  params: Promise<{ tech: string }>;
}) {
  const { tech } = await params;
  const track = await getTrack(tech);
  if (!track) notFound();
  const lessons = await getLessons(tech);
  // Pillar-page cross links: articles and career roadmaps that mention this
  // track, with descriptive anchors (SEO phase-1 item — also bridges crawl
  // discovery from indexed track pages into the blog cluster).
  const relatedPosts = getPostsForTrack(tech, track.title);
  const roadmapMentions = getRoadmapsForTrack(tech);
  // Quick-lookup bridge: if this track has a matching reference section
  // (e.g. html -> /reference/html), surface it as a card.
  const refSection = REF_SECTIONS.find((r) => r.track === tech) ?? null;
  const refCount = refSection ? getRefEntries(refSection.slug).length : 0;

  return (
    <>
      <TrackView track={tech} />
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
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[260px_1fr]">
        {/* Left chapter menu */}
        <aside className="md:sticky md:top-24 md:h-fit">
          <Sidebar track={tech} trackTitle={track.title} lessons={lessons} />
        </aside>

        {/* Main */}
        <div className="min-w-0">
          <Breadcrumbs
            items={[
              { name: "المسارات", href: "/learn" },
              { name: track.title, href: `/learn/${tech}` },
            ]}
          />
          <p className="mb-1 text-sm font-bold" style={{ color: track.color }}>
            {track.icon} مسار تعليمي
          </p>
          <h1 className="text-3xl font-extrabold md:text-4xl">
            تعليم <span style={{ color: track.color }}>{track.title}</span>
          </h1>

          {/* Learner progress + resume (client; hidden until started) */}
          <TrackProgress
            track={tech}
            color={track.color}
            lessons={lessons.map((l) => ({ slug: l.slug, title: l.title }))}
          />

          {/* Previous / Next bar */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <Link
              href="/learn"
              className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold transition hover:neon-glow"
            >
              ❯ كل المسارات
            </Link>
            {lessons.length > 0 && (
              <Link
                href={`/learn/${tech}/${lessons[0].slug}`}
                style={{ backgroundColor: track.color, color: onColor(track.color) }}
                className="rounded-full px-6 py-2.5 text-sm font-semibold transition hover:opacity-90"
              >
                التالي ❮
              </Link>
            )}
          </div>

          {/* Two cards: Learn + Get Certified */}
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {/* Learn card */}
            <div className="flex flex-col rounded-2xl border border-border bg-surface p-6">
              <div className="mb-3 flex items-center gap-3">
                <span
                  className="grid h-12 w-12 place-items-center rounded-xl text-2xl"
                  style={{ backgroundColor: `${track.color}22` }}
                >
                  {track.icon}
                </span>
                <h2 className="text-xl font-bold">تعلّم {track.title}</h2>
              </div>
              <p className="mb-2 text-sm text-muted">{track.description}</p>
              <p className="mb-5 flex-1 text-sm text-muted">
                ابدأ من الصفر وتدرّج خطوة بخطوة حتى الاحتراف — مجانًا وبأمثلة عملية.
              </p>
              {lessons.length > 0 && (
                <Link
                  href={`/learn/${tech}/${lessons[0].slug}`}
                  style={{ backgroundColor: track.color, color: onColor(track.color) }}
                  className="inline-block w-fit rounded-full px-6 py-3 font-bold transition hover:opacity-90"
                >
                  ابدأ التعلّم الآن ❮
                </Link>
              )}
            </div>

            {/* Certificate card */}
            {hasTrackAssessment(tech) && (
              <div className="flex flex-col rounded-2xl border border-border bg-surface p-6">
                <h2 className="mb-2 text-xl font-bold">
                  🏆 كن معتمدًا في {track.title}
                </h2>
                <p className="mb-4 text-sm text-muted">
                  اجتز اختبار {track.title} واحصل على شهادة إتمام قابلة للطباعة
                  تثبت مهارتك.
                </p>
                <div className="mb-4 flex-1 rounded-xl border border-border bg-background p-4 text-center">
                  <p className="text-xs text-muted">شهادة إتمام</p>
                  <p className="my-1 font-bold neon-text">The Code Fix</p>
                  <p className="text-sm">مسار {track.title}</p>
                </div>
                <Link
                  href={`/quiz/${tech}`}
                  className="inline-block w-fit rounded-full border border-border bg-background px-6 py-3 font-semibold transition hover:neon-glow"
                >
                  احصل على الشهادة ❮
                </Link>
              </div>
            )}
          </div>

          {/* Quick-reference bridge (e.g. HTML tags reference) */}
          {refSection && (
            <section className="mt-8">
              <Link
                href={`/reference/${refSection.slug}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-surface p-5 transition hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))]"
              >
                <div>
                  <h2 className="text-lg font-bold">
                    {refSection.icon} {refSection.title} — للمراجعة السريعة
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    تبحث عن {refSection.entityLabel} محدد بلا ترتيب الدروس؟ {refCount}{" "}
                    {refSection.entityLabel} موثق بالأمثلة التفاعلية.
                  </p>
                </div>
                <span className="font-semibold text-accent">افتح المرجع ←</span>
              </Link>
            </section>
          )}

          {/* Career roadmaps that include this track */}
          {roadmapMentions.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-xl font-bold">
                🗺️ أين يقع {track.title} في رحلتك المهنية؟
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {roadmapMentions.map((m) => (
                  <Link
                    key={m.slug}
                    href={`/roadmaps/${m.slug}`}
                    className="rounded-xl border border-border bg-surface p-4 transition hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]"
                  >
                    <p className="font-semibold">
                      {m.icon} {m.title}
                    </p>
                    <p className="mt-1 text-sm text-muted">
                      الخطوة {m.stepIndex}: {m.stepTitle}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Blog articles that mention this track */}
          {relatedPosts.length > 0 && (
            <section className="mt-8">
              <h2 className="mb-3 text-xl font-bold">
                📖 مقالات عن {track.title}
              </h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {relatedPosts.map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="rounded-xl border border-border bg-surface p-4 transition hover:border-[color-mix(in_srgb,var(--accent)_40%,var(--border))]"
                  >
                    <p className="font-semibold">{p.title}</p>
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {p.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

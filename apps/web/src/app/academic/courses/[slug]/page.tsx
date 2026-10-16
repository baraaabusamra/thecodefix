import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAcademicCourse, getAcademicCourses } from "@tcf/academic/courses";
import { getTracks, getLessons } from "@tcf/content/tracks";
import { SITE_URL } from "@tcf/core/site";
import JsonLd from "@tcf/ui/ui/JsonLd";

export function generateStaticParams() {
  return getAcademicCourses().map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const course = getAcademicCourse(slug);
  if (!course) return {};
  return {
    title: `مادة ${course.title} بالعربي`,
    description: course.description,
    keywords: [
      `مادة ${course.title}`,
      `شرح ${course.title} بالعربي`,
      `${course.title} جامعي`,
      "مواد علوم حاسوب بالعربي",
    ],
    alternates: { canonical: `/academic/courses/${slug}` },
    openGraph: {
      title: `مادة ${course.title} بالعربي`,
      description: course.description,
      url: `/academic/courses/${slug}`,
      type: "article",
    },
  };
}

export default async function AcademicCoursePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const course = getAcademicCourse(slug);
  if (!course) notFound();

  // Enrich topics with track info (icon + lesson count) and existence.
  const tracks = await getTracks();
  const trackMap = new Map(tracks.map((t) => [t.slug, t]));
  const topics = await Promise.all(
    course.topics.map(async (topic) => {
      const track = trackMap.get(topic.track) ?? null;
      const lessonCount = track ? (await getLessons(topic.track)).length : 0;
      return { ...topic, track: topic.track, meta: track, lessonCount };
    })
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `مادة ${course.title}`,
          description: course.description,
          url: `${SITE_URL}/academic/courses/${course.slug}`,
          itemListElement: topics.map((t, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: t.title,
            url: `${SITE_URL}/learn/${t.track}`,
          })),
        }}
      />

      <nav className="mb-4 text-sm text-muted">
        <Link href="/academic" className="hover:text-foreground">
          الجانب الأكاديمي
        </Link>
        {" / "}
        <Link href="/academic/courses" className="hover:text-foreground">
          كل المواد
        </Link>
        {" / "}
        {course.title}
      </nav>

      <div className="text-center">
        <span
          className="inline-grid h-20 w-20 place-items-center rounded-2xl text-5xl"
          style={{
            backgroundColor: `color-mix(in srgb, ${course.color} 20%, transparent)`,
            boxShadow: `0 0 44px -10px ${course.color}`,
          }}
        >
          {course.icon}
        </span>
        <h1 className="mt-4 text-4xl font-extrabold md:text-5xl">
          {course.title}
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted">{course.intro}</p>
      </div>

      {/* Units */}
      <ol className="relative mt-12 space-y-6 border-s-2 border-border ps-8">
        {topics.map((topic, i) => {
          const color = course.color;
          return (
            <li key={i} className="relative">
              <span
                className="absolute -start-[41px] grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {i + 1}
              </span>

              <div className="glass card-glow rounded-2xl p-5">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-lg font-bold">
                    {topic.meta && <span>{topic.meta.icon}</span>}
                    <span style={{ color }}>الوحدة {i + 1}:</span> {topic.title}
                    {topic.optional && (
                      <span className="rounded-full bg-border px-2 py-0.5 text-[10px] font-normal text-muted">
                        اختياري
                      </span>
                    )}
                  </h2>
                  {topic.meta && (
                    <span className="shrink-0 text-xs text-muted">
                      {topic.lessonCount} درس
                    </span>
                  )}
                </div>

                {/* Why */}
                <div className="mt-3">
                  <p className="text-sm font-bold">💡 ليش هاي الوحدة مهمة؟</p>
                  <p className="mt-1 text-sm text-muted">{topic.why}</p>
                </div>

                {/* Core concepts */}
                {topic.concepts?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-bold">🎯 أهم ما ستتقنه</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {topic.concepts.map((c) => (
                        <span
                          key={c}
                          className="rounded-full border border-border bg-background px-2.5 py-1 text-xs"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prerequisites + real world */}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-background p-3">
                    <p className="text-xs font-bold text-muted">📌 المتطلّبات السابقة</p>
                    <p className="mt-1 text-sm">{topic.prerequisites}</p>
                  </div>
                  <div className="rounded-lg bg-background p-3">
                    <p className="text-xs font-bold text-muted">💼 في سوق العمل</p>
                    <p className="mt-1 text-sm">{topic.realWorld}</p>
                  </div>
                </div>

                {/* CTA */}
                {topic.meta && (
                  <Link
                    href={`/learn/${topic.track}`}
                    className="mt-4 inline-block rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: color }}
                  >
                    ابدأ {topic.title} ←
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="glass mt-12 rounded-2xl p-6 text-center neon-glow">
        <p className="text-lg font-bold">جاهز تبدأ؟ 🚀</p>
        <p className="mt-1 text-sm text-muted">
          هاد دليل مرافق للمادة، مو بديل عن المحاضرة — استخدمه للتطبيق العملي
          جنب دراستك.
        </p>
        {topics[0]?.meta && (
          <Link
            href={`/learn/${topics[0].track}`}
            className="btn-neon mt-4 px-8 py-3"
          >
            ابدأ بـ {topics[0].title}
          </Link>
        )}
      </div>
    </div>
  );
}

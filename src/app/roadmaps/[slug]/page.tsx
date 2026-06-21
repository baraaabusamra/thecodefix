import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getRoadmap, getRoadmaps } from "@/lib/roadmaps";
import { getTracks, getLessons } from "@/lib/content";
import { SITE_URL } from "@/lib/site";
import JsonLd from "@/components/JsonLd";

export function generateStaticParams() {
  return getRoadmaps().map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const roadmap = getRoadmap(slug);
  if (!roadmap) return {};
  return {
    title: `خريطة طريق ${roadmap.title}`,
    description: roadmap.description,
  };
}

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const roadmap = getRoadmap(slug);
  if (!roadmap) notFound();

  // Enrich steps with track info (icon + lesson count) and existence.
  const tracks = await getTracks();
  const trackMap = new Map(tracks.map((t) => [t.slug, t]));
  const steps = await Promise.all(
    roadmap.steps.map(async (step) => {
      const track = trackMap.get(step.track) ?? null;
      const lessonCount = track ? (await getLessons(step.track)).length : 0;
      return { ...step, track: step.track, meta: track, lessonCount };
    })
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `خريطة طريق ${roadmap.title}`,
          description: roadmap.description,
          url: `${SITE_URL}/roadmaps/${roadmap.slug}`,
          itemListElement: steps.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: s.title,
            url: `${SITE_URL}/learn/${s.track}`,
          })),
        }}
      />

      <nav className="mb-4 text-sm text-muted">
        <Link href="/roadmaps" className="hover:text-foreground">
          خرائط الطريق
        </Link>
        {" / "}
        {roadmap.title}
      </nav>

      <div className="text-center">
        <span className="text-5xl">{roadmap.icon}</span>
        <h1 className="mt-3 text-3xl font-bold md:text-4xl">{roadmap.title}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted">{roadmap.intro}</p>
      </div>

      {/* Timeline */}
      <ol className="relative mt-12 space-y-6 border-s-2 border-border ps-8">
        {steps.map((step, i) => {
          const color = roadmap.color;
          return (
            <li key={i} className="relative">
              <span
                className="absolute -start-[41px] grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {i + 1}
              </span>

              <div className="rounded-2xl border border-border bg-surface p-5">
                {/* Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="flex items-center gap-2 text-lg font-bold">
                    {step.meta && <span>{step.meta.icon}</span>}
                    <span style={{ color }}>المرحلة {i + 1}:</span> {step.title}
                    {step.optional && (
                      <span className="rounded-full bg-border px-2 py-0.5 text-[10px] font-normal text-muted">
                        اختياري
                      </span>
                    )}
                  </h2>
                  {step.meta && (
                    <span className="shrink-0 text-xs text-muted">
                      {step.lessonCount} درس
                    </span>
                  )}
                </div>

                {/* Why */}
                <div className="mt-3">
                  <p className="text-sm font-bold">💡 لماذا هذه المرحلة؟</p>
                  <p className="mt-1 text-sm text-muted">{step.why}</p>
                </div>

                {/* Core concepts */}
                {step.concepts?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-bold">🎯 أهم ما ستتقنه</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {step.concepts.map((c) => (
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
                    <p className="mt-1 text-sm">{step.prerequisites}</p>
                  </div>
                  <div className="rounded-lg bg-background p-3">
                    <p className="text-xs font-bold text-muted">💼 في سوق العمل</p>
                    <p className="mt-1 text-sm">{step.realWorld}</p>
                  </div>
                </div>

                {/* CTA */}
                {step.meta && (
                  <Link
                    href={`/learn/${step.track}`}
                    className="mt-4 inline-block rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                    style={{ backgroundColor: color }}
                  >
                    ابدأ تعلّم {step.title} ←
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-12 rounded-2xl border border-border bg-surface p-6 text-center">
        <p className="font-bold">جاهز للبدء؟ 🚀</p>
        <p className="mt-1 text-sm text-muted">
          ابدأ من المرحلة الأولى وتدرّج خطوة بخطوة — وكل مرحلة فيها اختبار وشهادة.
        </p>
        {steps[0]?.meta && (
          <Link
            href={`/learn/${steps[0].track}`}
            className="mt-4 inline-block rounded-full bg-brand-purple px-8 py-3 font-semibold text-white transition hover:opacity-90"
          >
            ابدأ بـ {steps[0].title}
          </Link>
        )}
      </div>
    </div>
  );
}

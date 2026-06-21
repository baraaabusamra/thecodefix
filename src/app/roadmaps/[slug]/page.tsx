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
      <ol className="relative mt-12 space-y-5 border-s-2 border-border ps-8">
        {steps.map((step, i) => {
          const color = roadmap.color;
          const inner = (
            <div className="rounded-xl border border-border bg-surface p-4 transition group-hover:neon-glow">
              <div className="flex items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-bold">
                  {step.meta && <span>{step.meta.icon}</span>}
                  {step.title}
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
              <p className="mt-1 text-sm text-muted">{step.note}</p>
              {step.meta && (
                <span
                  className="mt-2 inline-block text-sm font-semibold"
                  style={{ color }}
                >
                  ابدأ التعلّم →
                </span>
              )}
            </div>
          );

          return (
            <li key={i} className="relative">
              <span
                className="absolute -start-[41px] grid h-8 w-8 place-items-center rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: color }}
              >
                {i + 1}
              </span>
              {step.meta ? (
                <Link href={`/learn/${step.track}`} className="group block">
                  {inner}
                </Link>
              ) : (
                <div className="opacity-70">{inner}</div>
              )}
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

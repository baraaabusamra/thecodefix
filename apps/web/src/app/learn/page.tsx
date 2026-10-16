import Link from "next/link";
import type { Metadata } from "next";
import { getTracks, getLessons } from "@tcf/content/tracks";
import JsonLd from "@tcf/ui/ui/JsonLd";
import { SITE_URL } from "@tcf/core/site";
import { BASE_KEYWORDS } from "@tcf/content/seo";

export const metadata: Metadata = {
  title: "كل المسارات التعليمية",
  description:
    "تصفّح أكثر من 30 مسارًا لتعلّم البرمجة بالعربي — HTML و CSS و JavaScript و Python و React و SQL والمزيد، بشروحات وأمثلة تفاعلية واختبارات وشهادات مجانية.",
  keywords: [
    "مسارات تعلم البرمجة",
    "دورات برمجة بالعربي",
    "تعلم لغات البرمجة",
    "كورسات برمجة مجانية بالعربي",
    ...BASE_KEYWORDS,
  ],
  alternates: { canonical: "/learn" },
};

export default async function LearnIndex() {
  const tracks = await getTracks();
  const lessonCounts: Record<string, number> = {};
  await Promise.all(
    tracks.map(async (t) => {
      lessonCounts[t.slug] = (await getLessons(t.slug)).length;
    })
  );
  return (
    <div className="mx-auto max-w-6xl px-4 py-12 2xl:max-w-[1500px]">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "مسارات تعلّم البرمجة بالعربي",
          numberOfItems: tracks.length,
          itemListElement: tracks.map((t, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: `تعلّم ${t.title}`,
            url: `${SITE_URL}/learn/${t.slug}`,
          })),
        }}
      />
      <h1 className="mb-2 text-4xl font-extrabold">
        المسارات <span className="neon-text-animated">التعليمية</span>
      </h1>
      <p className="mb-8 text-muted">اختر مسارًا وابدأ رحلتك من الصفر.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tracks.map((t) => (
          <Link
            key={t.slug}
            href={`/learn/${t.slug}`}
            className="group glass card-glow rounded-2xl p-6"
          >
            <div
              className="mb-3 inline-grid h-14 w-14 place-items-center rounded-xl text-3xl"
              style={{
                backgroundColor: `color-mix(in srgb, ${t.color} 20%, transparent)`,
                boxShadow: `0 0 28px -10px ${t.color}`,
              }}
            >
              {t.icon}
            </div>
            <h2 className="mb-1 text-xl font-bold group-hover:neon-text">
              {t.title}
            </h2>
            <p className="mb-4 text-sm text-muted">{t.description}</p>
            <span className="text-sm font-semibold text-brand-cyan">
              {lessonCounts[t.slug]} درس →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

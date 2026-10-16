import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  REF_SECTIONS,
  getRefSection,
  getRefEntries,
  getRefCategories,
} from "@tcf/content/reference";
import Breadcrumbs from "@tcf/ui/ui/Breadcrumbs";
import JsonLd from "@tcf/ui/ui/JsonLd";
import { SITE_URL } from "@tcf/core/site";

export function generateStaticParams() {
  return REF_SECTIONS.map((s) => ({ section: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string }>;
}): Promise<Metadata> {
  const { section } = await params;
  const s = getRefSection(section);
  if (!s) return {};
  const count = getRefEntries(section).length;
  return {
    title: { absolute: `${s.title} بالعربي — ${count} ${s.entityLabel} بالأمثلة` },
    description: s.intro,
    keywords: [`مرجع ${section}`, `${s.title} بالعربي`, `وسوم ${section} بالعربي`],
    alternates: { canonical: `/reference/${section}` },
  };
}

export default async function RefSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const s = getRefSection(section);
  if (!s) notFound();
  const entries = getRefEntries(section);
  const categories = getRefCategories(entries);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: `${s.title} بالعربي`,
          numberOfItems: entries.length,
          itemListElement: entries.map((e, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: `${e.name} — ${e.title}`,
            url: `${SITE_URL}/reference/${section}/${e.slug}`,
          })),
        }}
      />
      <Breadcrumbs
        items={[
          { name: "الرئيسية", href: "/" },
          { name: "المرجع", href: "/reference" },
          { name: s.title, href: `/reference/${section}` },
        ]}
      />
      <h1 className="text-3xl font-extrabold md:text-4xl">
        {s.icon} {s.title} <span className="neon-text">بالعربي</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        {s.intro} حاليًا {entries.length} {s.entityLabel} — والقائمة تكبر.
      </p>

      {categories.map((cat) => (
        <section key={cat} className="mt-10">
          <h2 className="mb-4 text-xl font-bold">{cat}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {entries
              .filter((e) => e.category === cat)
              .map((e) => (
                <Link
                  key={e.slug}
                  href={`/reference/${section}/${e.slug}`}
                  className="rounded-xl border border-border bg-surface p-4 transition hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))]"
                >
                  <p className="font-mono text-sm font-bold text-accent" dir="ltr">
                    {e.name}
                  </p>
                  <p className="mt-1 font-semibold">{e.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{e.summary}</p>
                </Link>
              ))}
          </div>
        </section>
      ))}

      <p className="mt-12 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
        🎓 تريد التعلم بالترتيب بدل المرجع السريع؟ ابدأ من{" "}
        <Link href={`/learn/${s.track}`} className="font-semibold text-accent underline">
          مسار {section.toUpperCase()} الكامل بالعربي
        </Link>
        .
      </p>
    </div>
  );
}

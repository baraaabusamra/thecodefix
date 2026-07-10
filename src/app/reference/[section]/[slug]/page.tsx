import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  REF_SECTIONS,
  getRefSection,
  getRefEntries,
  getRefEntry,
} from "@/lib/reference";
import Breadcrumbs from "@/components/Breadcrumbs";
import JsonLd from "@/components/JsonLd";
import Playground from "@/components/Playground";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return REF_SECTIONS.flatMap((s) =>
    getRefEntries(s.slug).map((e) => ({ section: s.slug, slug: e.slug }))
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string; slug: string }>;
}): Promise<Metadata> {
  const { section, slug } = await params;
  const entry = getRefEntry(section, slug);
  if (!entry) return {};
  // Keyword-first absolute title, e.g. "وسم a في HTML بالعربي — الشرح والأمثلة"
  const plainName = entry.name.replace(/[<>]/g, "");
  return {
    title: {
      absolute: `${entry.title} ${plainName} في ${section.toUpperCase()} بالعربي — الشرح والأمثلة`,
    },
    description: entry.summary,
    keywords: entry.keywords,
    alternates: { canonical: `/reference/${section}/${slug}` },
    openGraph: {
      title: `${entry.title} ${plainName} بالعربي`,
      description: entry.summary,
      type: "article",
    },
  };
}

export default async function RefEntryPage({
  params,
}: {
  params: Promise<{ section: string; slug: string }>;
}) {
  const { section, slug } = await params;
  const s = getRefSection(section);
  const entry = getRefEntry(section, slug);
  if (!s || !entry) notFound();

  const related = (entry.related ?? [])
    .map((r) => getRefEntry(section, r))
    .filter((e): e is NonNullable<typeof e> => !!e);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TechArticle",
          headline: `${entry.title} ${entry.name} في ${section.toUpperCase()} بالعربي`,
          description: entry.summary,
          inLanguage: "ar",
          url: `${SITE_URL}/reference/${section}/${slug}`,
          isAccessibleForFree: true,
          author: { "@id": `${SITE_URL}/#organization` },
          publisher: { "@id": `${SITE_URL}/#organization` },
        }}
      />
      <Breadcrumbs
        items={[
          { name: "المرجع", href: "/reference" },
          { name: s.title, href: `/reference/${section}` },
          { name: entry.title, href: `/reference/${section}/${slug}` },
        ]}
      />

      {/* Header */}
      <p className="mb-1 font-mono text-sm font-bold text-accent" dir="ltr">
        {entry.name}
      </p>
      <h1 className="text-3xl font-bold">
        {entry.title} <span className="text-muted">{entry.name}</span>
      </h1>
      <p className="mt-3 text-lg leading-relaxed">{entry.summary}</p>

      {/* Description */}
      <section className="mt-6 space-y-4">
        {entry.description.split("\n\n").map((para, i) => (
          <p key={i} className="leading-relaxed text-foreground/90">
            {para}
          </p>
        ))}
      </section>

      {/* Syntax */}
      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">الصياغة</h2>
        <pre
          dir="ltr"
          className="overflow-x-auto rounded-xl border border-border bg-[#12101a] p-4 font-mono text-sm leading-relaxed text-[#e2e0ea]"
        >
          {entry.syntax}
        </pre>
      </section>

      {/* Interactive example — the thing MDN doesn't have in Arabic */}
      <section className="mt-8">
        <h2 className="mb-1 text-xl font-bold">⚡ جرّب بنفسك</h2>
        <p className="mb-2 text-sm text-muted">
          عدّل الكود واضغط «تحديث» لترى النتيجة فورًا — التجربة أفضل معلّم.
        </p>
        <Playground mode={s.playgroundMode} initialCode={entry.example} height={220} />
      </section>

      {/* Attributes */}
      {entry.attributes && entry.attributes.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold">أهم الخصائص</h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface text-xs text-muted">
                <tr>
                  <th className="px-4 py-2 text-start">الخاصية</th>
                  <th className="px-4 py-2 text-start">الوظيفة</th>
                </tr>
              </thead>
              <tbody>
                {entry.attributes.map((a) => (
                  <tr key={a.name} className="border-t border-border">
                    <td className="whitespace-nowrap px-4 py-2 font-mono font-semibold text-accent" dir="ltr">
                      {a.name}
                    </td>
                    <td className="px-4 py-2">{a.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Tips */}
      {entry.tips && entry.tips.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold">💡 نصائح عملية</h2>
          <ul className="space-y-2">
            {entry.tips.map((t, i) => (
              <li
                key={i}
                className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm"
              >
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Common mistakes */}
      {entry.mistakes && entry.mistakes.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold">⚠️ أخطاء شائعة</h2>
          <ul className="space-y-2">
            {entry.mistakes.map((m, i) => (
              <li
                key={i}
                className="rounded-lg border border-red-500/25 bg-red-500/5 px-4 py-2.5 text-sm"
              >
                {m}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Related entries */}
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-xl font-bold">وسوم ذات صلة</h2>
          <div className="flex flex-wrap gap-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/reference/${section}/${r.slug}`}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm font-semibold transition hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))]"
              >
                <span className="font-mono text-accent" dir="ltr">
                  {r.name}
                </span>{" "}
                {r.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Learn more + source */}
      <section className="mt-10 space-y-3 border-t border-border pt-6 text-sm text-muted">
        <p>
          🎓 تريد فهم الصورة الكاملة خطوة بخطوة؟ ابدأ من{" "}
          <Link href={`/learn/${s.track}`} className="font-semibold text-accent underline">
            مسار {section.toUpperCase()} الكامل بالعربي
          </Link>
          .
        </p>
        {entry.mdn && (
          <p>
            📚 للتعمق التقني الكامل بالإنجليزية:{" "}
            <a
              href={entry.mdn}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-accent underline"
              dir="ltr"
            >
              MDN Web Docs
            </a>
          </p>
        )}
      </section>
    </div>
  );
}

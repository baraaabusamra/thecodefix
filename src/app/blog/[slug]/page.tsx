import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getPost, getPosts, getRelatedPosts } from "@/lib/blog";
import ArticleShare from "@/components/ArticleShare";
import Mdx from "@/components/Mdx";
import JsonLd from "@/components/JsonLd";
import Breadcrumbs from "@/components/Breadcrumbs";
import { SITE_URL } from "@/lib/site";
import { getPostSources } from "@/lib/blog-sources";

export function generateStaticParams() {
  return getPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};
  return {
    // Prefer a keyword-first seoTitle when set (kept absolute so the visible H1
    // stays natural); otherwise fall back to the post title.
    title: post.seoTitle ? { absolute: post.seoTitle } : post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: `/blog/${slug}` },
    openGraph: { title: post.title, description: post.description, type: "article" },
  };
}

export default async function BlogPost({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug);
  const sources = getPostSources(slug);

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          dateModified: post.updated ?? post.date,
          inLanguage: "ar",
          keywords: post.keywords?.join(", "),
          url: `${SITE_URL}/blog/${slug}`,
          mainEntityOfPage: `${SITE_URL}/blog/${slug}`,
          isAccessibleForFree: true,
          // Link to the single Organization entity declared in the root layout
          // so author/publisher resolve to one consistent, authoritative entity.
          author: { "@id": `${SITE_URL}/#organization` },
          publisher: { "@id": `${SITE_URL}/#organization` },
        }}
      />
      <Breadcrumbs
        items={[
          { name: "الرئيسية", href: "/" },
          { name: "المدوّنة", href: "/blog" },
          { name: post.title, href: `/blog/${slug}` },
        ]}
      />
      <p className="mb-2 text-sm text-muted">
        {new Date(post.date).toLocaleDateString("ar-EG", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
        {post.updated && post.updated !== post.date && (
          <>
            {" · "}
            <span>
              آخر تحديث:{" "}
              {new Date(post.updated).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </>
        )}
      </p>
      <h1 className="mb-4 text-3xl font-bold leading-snug">{post.title}</h1>
      <div className="mb-8">
        <ArticleShare slug={slug} title={post.title} />
      </div>

      {post.tldr && (
        <aside className="mb-8 rounded-2xl border border-brand-purple/40 bg-brand-purple/5 p-5">
          <p className="mb-1 text-sm font-bold text-brand-purple">⚡ باختصار</p>
          <p className="text-sm leading-relaxed">{post.tldr}</p>
        </aside>
      )}

      <Mdx source={post.content} />

      {sources.length > 0 && (
        <section className="mt-10 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted">
          📚 مصادر رسمية للتعمّق:{" "}
          {sources.map((s, i) => (
            <span key={s.url}>
              {i > 0 && " — "}
              <a
                href={s.url}
                target="_blank"
                rel="noopener"
                className="font-semibold text-brand-cyan hover:underline"
              >
                {s.label}
              </a>
            </span>
          ))}
        </section>
      )}

      {post.faq && post.faq.length > 0 && (
        <section className="mt-12 border-t border-border pt-8">
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: post.faq.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            }}
          />
          <h2 className="mb-6 text-2xl font-bold">الأسئلة الشائعة</h2>
          <div className="space-y-3">
            {post.faq.map((f) => (
              <details
                key={f.q}
                className="card-glow rounded-xl border border-border bg-surface p-4 open:border-brand-purple/40"
              >
                <summary className="cursor-pointer font-semibold">{f.q}</summary>
                <p className="mt-2 text-sm text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="mb-6 text-2xl font-bold">اقرأ أيضًا</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="glass card-glow block rounded-xl p-4"
              >
                <h3 className="font-bold hover:neon-text">{r.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted">
                  {r.description}
                </p>
              </Link>
            ))}
          </div>
          <p className="mt-6 text-sm text-muted">
            تصفّح كل المقالات في{" "}
            <Link href="/blog" className="text-brand-purple hover:underline">
              المدوّنة
            </Link>
            ، أو ابدأ التعلّم من{" "}
            <Link href="/learn" className="text-brand-purple hover:underline">
              المسارات
            </Link>{" "}
            و{" "}
            <Link href="/roadmaps" className="text-brand-purple hover:underline">
              خرائط الطريق
            </Link>
            .
          </p>
        </section>
      )}
    </div>
  );
}

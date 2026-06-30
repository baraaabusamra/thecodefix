import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getPost, getPosts, getRelatedPosts } from "@/lib/blog";
import Mdx from "@/components/Mdx";
import JsonLd from "@/components/JsonLd";
import Breadcrumbs from "@/components/Breadcrumbs";
import { SITE_URL } from "@/lib/site";

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
    title: post.title,
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.description,
          datePublished: post.date,
          inLanguage: "ar",
          keywords: post.keywords?.join(", "),
          url: `${SITE_URL}/blog/${slug}`,
          author: { "@type": "Organization", name: "The Code Fix" },
          publisher: { "@type": "Organization", name: "The Code Fix", url: SITE_URL },
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
      </p>
      <h1 className="mb-8 text-3xl font-bold leading-snug">{post.title}</h1>
      <Mdx source={post.content} />

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

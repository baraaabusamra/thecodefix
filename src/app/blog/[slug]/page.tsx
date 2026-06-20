import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPost, getPosts } from "@/lib/blog";
import Mdx from "@/components/Mdx";
import JsonLd from "@/components/JsonLd";
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
      <nav className="mb-4 text-sm text-muted">
        <Link href="/blog" className="hover:text-foreground">المدوّنة</Link>
      </nav>
      <p className="mb-2 text-sm text-muted">
        {new Date(post.date).toLocaleDateString("ar-EG", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}
      </p>
      <h1 className="mb-8 text-3xl font-bold leading-snug">{post.title}</h1>
      <Mdx source={post.content} />
    </div>
  );
}

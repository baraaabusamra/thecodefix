import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getCreatorByDisplayName, getPost } from "@tcf/creators/creators";
import ShareButton from "@tcf/ui/ui/ShareButton";
import JsonLd from "@tcf/ui/ui/JsonLd";
import { SITE_URL } from "@tcf/core/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ displayName: string; postId: string }>;
}): Promise<Metadata> {
  const { displayName, postId } = await params;
  const creator = await getCreatorByDisplayName(decodeURIComponent(displayName));
  const post = creator ? await getPost(postId) : null;
  if (!creator || !post || post.creatorId !== creator.id || post.status !== "approved" || creator.status === "suspended") {
    return { title: "المنشور غير موجود" };
  }

  return {
    title: `${post.title} — ${creator.displayName}`,
    description: post.body.slice(0, 160),
    alternates: { canonical: `/creators/${encodeURIComponent(creator.displayName)}/${post.id}` },
    openGraph: {
      title: post.title,
      description: post.body.slice(0, 160),
      type: "article",
      images: post.imageUrl ? [post.imageUrl] : undefined,
    },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ displayName: string; postId: string }>;
}) {
  const { displayName, postId } = await params;
  const creator = await getCreatorByDisplayName(decodeURIComponent(displayName));
  const post = creator ? await getPost(postId) : null;
  if (!creator || !post || post.creatorId !== creator.id || post.status !== "approved" || creator.status === "suspended") {
    notFound();
  }

  const hashtags = (post.hashtags ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    headline: post.title,
    description: post.body,
    image: post.imageUrl ?? undefined,
    datePublished: (post.publishedAt ?? post.createdAt).toISOString(),
    dateModified: post.updatedAt.toISOString(),
    url: `${SITE_URL}/creators/${encodeURIComponent(creator.displayName)}/${post.id}`,
    author: { "@type": "Person", name: creator.displayName },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-2xl px-4 py-16">
        <nav className="mb-6 text-sm text-muted">
          <Link href="/creators/gallery" className="hover:text-foreground">
            المبدعون
          </Link>
          {" / "}
          <Link
            href={`/creators/${encodeURIComponent(creator.displayName)}`}
            className="hover:text-foreground"
          >
            {creator.displayName}
          </Link>
        </nav>

        {post.imageUrl && (
          <div className="relative mb-6 aspect-video overflow-hidden rounded-xl bg-surface/60">
            <Image src={post.imageUrl} alt={post.title} fill className="object-cover" unoptimized />
          </div>
        )}

        <h1 className="text-2xl font-bold">{post.title}</h1>
        <p className="mt-1 text-sm text-muted">
          بواسطة{" "}
          <Link
            href={`/creators/${encodeURIComponent(creator.displayName)}`}
            className="text-brand-cyan hover:underline"
          >
            {creator.displayName}
          </Link>
          {" · "}
          {new Date(post.publishedAt ?? post.createdAt).toLocaleDateString("ar-SA")}
        </p>

        <p className="mt-6 whitespace-pre-wrap leading-relaxed">{post.body}</p>

        {post.link && (
          <a
            href={post.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block text-sm font-medium text-brand-cyan hover:underline"
          >
            فتح الرابط المرفق ←
          </a>
        )}

        {hashtags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {hashtags.map((tag) => (
              <Link
                key={tag}
                href={`/creators/gallery?q=${encodeURIComponent(tag)}`}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted transition hover:border-accent hover:text-accent"
              >
                #{tag}
              </Link>
            ))}
          </div>
        )}

        <div className="mt-8 border-t border-border pt-6">
          <ShareButton title={post.title} />
        </div>
      </div>
    </>
  );
}

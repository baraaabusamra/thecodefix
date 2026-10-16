import type { Metadata } from "next";
import { listApprovedPosts } from "@tcf/creators/creators";
import VideoGallery from "@tcf/creators/ui/VideoGallery";
import JsonLd from "@tcf/ui/ui/JsonLd";

export const metadata: Metadata = {
  title: "منشورات المبدعين",
  description: "منشورات من مجتمع المبدعين في The Code Fix — JavaScript, Python, HTML, CSS والمزيد.",
  openGraph: {
    title: "منشورات المبدعين — The Code Fix",
    description: "تصفّح منشورات من مجتمع المبرمجين العرب.",
    type: "website",
  },
};

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const submissions = await listApprovedPosts({
    search: q,
    limit: 100,
  });

  const items = submissions ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "منشورات المبدعين — The Code Fix",
    description: "منشورات من مجتمع المبدعين.",
    url: "https://thecodefix.net/creators/gallery",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "CreativeWork",
          name: item.title,
          description: item.body,
          url: item.link ?? undefined,
          author: { "@type": "Person", name: item.creatorDisplayName },
        },
      })),
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <VideoGallery submissions={items} currentSearch={q} />
    </>
  );
}

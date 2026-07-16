import type { Metadata } from "next";
import { listApprovedSubmissions } from "@/lib/creators";
import VideoGallery from "@/components/creators/VideoGallery";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "فيديوهات المبدعين",
  description: "دروس وشروحات برمجية من مجتمع المبدعين في The Code Fix — JavaScript, Python, HTML, CSS والمزيد.",
  openGraph: {
    title: "فيديوهات المبدعين — The Code Fix",
    description: "شاهد فيديوهات تعليمية من مجتمع المبرمجين العرب.",
    type: "website",
  },
};

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; q?: string }>;
}) {
  const { platform, q } = await searchParams;
  const submissions = await listApprovedSubmissions({
    platform,
    search: q,
    limit: 100,
  });

  const items = submissions ?? [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "فيديوهات المبدعين — The Code Fix",
    description: "دروس وشروحات برمجية من مجتمع المبدعين.",
    url: "https://thecodefix.net/creators/gallery",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "VideoObject",
          name: item.title,
          description: item.description ?? "",
          url: item.videoUrl,
          author: { "@type": "Person", name: item.creatorDisplayName },
        },
      })),
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />
      <VideoGallery submissions={items} currentPlatform={platform} currentSearch={q} />
    </>
  );
}

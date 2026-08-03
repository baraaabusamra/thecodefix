import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTrack, getTracks } from "@/lib/content";
import { hasQuiz } from "@/lib/quiz";
import { isAuthEnabled } from "@/lib/flags";
import Certificate from "@/components/Certificate";

export async function generateStaticParams() {
  return (await getTracks())
    .filter((t) => hasQuiz(t.slug))
    .map((t) => ({ tech: t.slug }));
}

// Per-track title/description so a shared link previews the right credential.
// The page renders the visitor's OWN certificate (client-gated by quiz result)
// and is not in the sitemap — noindex keeps these thin personalized pages out
// of the index; the indexable target for "شهادة/اختبار {لغة}" is /quiz/[tech].
export async function generateMetadata({
  params,
}: {
  params: Promise<{ tech: string }>;
}): Promise<Metadata> {
  const { tech } = await params;
  const track = await getTrack(tech);
  if (!track) return {};
  return {
    title: `شهادة ${track.title}`,
    description: `شهادة إتمام مسار ${track.title} من The Code Fix — مجانية، قابلة للطباعة، ويمكن التحقّق منها برقم الشهادة.`,
    keywords: [
      `شهادة ${track.title}`,
      `شهادة ${track.title} مجانية`,
      "شهادة برمجة مجانية",
      "شهادة إتمام مسار",
    ],
    alternates: { canonical: `/certificate/${tech}` },
    robots: { index: false, follow: true },
  };
}

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ tech: string }>;
}) {
  const { tech } = await params;
  const track = await getTrack(tech);
  if (!track) notFound();
  return <Certificate track={tech} trackTitle={track.title} authEnabled={isAuthEnabled()} />;
}

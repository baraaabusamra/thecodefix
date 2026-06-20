import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTrack, getTracks } from "@/lib/content";
import { hasQuiz } from "@/lib/quiz";
import Certificate from "@/components/Certificate";

export async function generateStaticParams() {
  return (await getTracks())
    .filter((t) => hasQuiz(t.slug))
    .map((t) => ({ tech: t.slug }));
}

export const metadata: Metadata = {
  title: "الشهادة",
  description: "شهادة إتمام مسار من The Code Fix.",
};

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ tech: string }>;
}) {
  const { tech } = await params;
  const track = await getTrack(tech);
  if (!track) notFound();
  return <Certificate track={tech} trackTitle={track.title} />;
}

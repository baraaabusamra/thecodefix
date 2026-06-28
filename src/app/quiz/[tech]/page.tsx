import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTrack, getTracks } from "@/lib/content";
import { getQuiz, hasQuiz } from "@/lib/quiz";
import QuizRunner from "@/components/QuizRunner";

export async function generateStaticParams() {
  return (await getTracks())
    .filter((t) => hasQuiz(t.slug))
    .map((t) => ({ tech: t.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tech: string }>;
}): Promise<Metadata> {
  const { tech } = await params;
  const track = await getTrack(tech);
  if (!track) return {};
  return {
    title: `اختبار ${track.title}`,
    description: `اختبر معلوماتك في ${track.title} واحصل على شهادة إتمام من The Code Fix.`,
    alternates: { canonical: `/quiz/${tech}` },
  };
}

export default async function QuizPage({
  params,
}: {
  params: Promise<{ tech: string }>;
}) {
  const { tech } = await params;
  const track = await getTrack(tech);
  const quiz = getQuiz(tech);
  if (!track || !quiz) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <nav className="mb-4 text-sm text-muted">
        <Link href={`/learn/${tech}`} className="hover:text-foreground">
          {track.title}
        </Link>
        {" / "}اختبار
      </nav>
      <h1 className="mb-2 text-3xl font-bold">{quiz.title}</h1>
      <p className="mb-8 text-muted">
        أجب عن الأسئلة التالية لتختبر فهمك وتحصل على شهادة.
      </p>
      <QuizRunner track={tech} trackTitle={track.title} quiz={quiz} />
    </div>
  );
}

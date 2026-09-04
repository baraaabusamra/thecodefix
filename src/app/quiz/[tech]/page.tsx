import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTrack, getTracks } from "@/lib/content";
import { getQuiz, hasQuiz } from "@/lib/quiz";
import { hasExamBank } from "@/lib/quiz-bank";
import QuizRunner from "@/components/QuizRunner";
import ExamRunner from "@/components/ExamRunner";
import { isAuthEnabled } from "@/lib/flags";
import JsonLd from "@/components/JsonLd";
import Breadcrumbs from "@/components/Breadcrumbs";
import { SITE_URL } from "@/lib/site";

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
    description: `اختبر معلوماتك في ${track.title} بأسئلة اختيار من متعدّد، واحصل على شهادة إتمام مجانية قابلة للتحقّق من The Code Fix.`,
    keywords: [
      `اختبار ${track.title}`,
      `كويز ${track.title}`,
      `أسئلة ${track.title}`,
      `شهادة ${track.title}`,
      `اختبر معلوماتك في ${track.title}`,
      "شهادة برمجة مجانية",
    ],
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
  if (!track) notFound();

  // Tracks with a real server-side question bank (currently: html) get the
  // secure, server-graded final-exam flow at this SAME url — preserving any
  // existing search traffic to /quiz/<tech> — instead of the legacy
  // client-graded QuizRunner every other track still uses unchanged below.
  if (hasExamBank(tech)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Quiz",
            name: `الاختبار النهائي — ${track.title}`,
            about: { "@type": "Thing", name: track.title },
            isPartOf: {
              "@type": "Course",
              name: `${track.title} بالعربي`,
              url: `${SITE_URL}/learn/${tech}`,
            },
            // Deliberately no `hasPart`/accepted answers here — unlike the
            // legacy quiz below, this bank's questions and answers are
            // server-only and must never appear in a public page, including
            // structured data.
            numberOfQuestions: 40,
            isAccessibleForFree: true,
            inLanguage: "ar",
            publisher: { "@id": `${SITE_URL}/#organization` },
          }}
        />
        <Breadcrumbs
          items={[
            { name: "الرئيسية", href: "/" },
            { name: "المسارات", href: "/learn" },
            { name: track.title, href: `/learn/${tech}` },
            { name: "الاختبار النهائي", href: `/quiz/${tech}` },
          ]}
        />
        <h1 className="mb-2 text-3xl font-bold">الاختبار النهائي — {track.title}</h1>
        <p className="mb-4 text-muted">
          أكمل اختبار كل درس أساسي أولًا، ثم اجتز هذا الاختبار النهائي للحصول على شهادتك.
        </p>
        <ExamRunner track={tech} trackTitle={track.title} />
      </div>
    );
  }

  const quiz = getQuiz(tech);
  if (!quiz) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Quiz",
          name: quiz.title,
          about: { "@type": "Thing", name: track.title },
          isPartOf: {
            "@type": "Course",
            name: `${track.title} بالعربي`,
            url: `${SITE_URL}/learn/${tech}`,
          },
          numberOfQuestions: quiz.questions.length,
          isAccessibleForFree: true,
          inLanguage: "ar",
          hasPart: quiz.questions.map((q) => ({
            "@type": "Question",
            name: q.q,
            acceptedAnswer: { "@type": "Answer", text: q.options[q.answer] },
          })),
          publisher: { "@id": `${SITE_URL}/#organization` },
        }}
      />
      <Breadcrumbs
        items={[
          { name: "الرئيسية", href: "/" },
          { name: "المسارات", href: "/learn" },
          { name: track.title, href: `/learn/${tech}` },
          { name: "اختبار", href: `/quiz/${tech}` },
        ]}
      />
      <h1 className="mb-2 text-3xl font-bold">{quiz.title}</h1>
      <p className="mb-8 text-muted">
        أجب عن الأسئلة التالية لتختبر فهمك وتحصل على شهادة.
      </p>
      <QuizRunner
        track={tech}
        trackTitle={track.title}
        quiz={quiz}
        authEnabled={isAuthEnabled()}
      />
    </div>
  );
}

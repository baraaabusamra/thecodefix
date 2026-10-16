import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTrack, getTracks } from "@tcf/content/tracks";
import { getQuiz } from "@tcf/content/quizzes";
import { hasExamBank, hasTrackAssessment } from "@tcf/assessment/quiz-bank";
import { getExamPrerequisitePolicy } from "@tcf/assessment/requirements";
import QuizRunner from "@tcf/assessment/ui/QuizRunner";
import ExamRunner from "@tcf/assessment/ui/ExamRunner";
import { isAuthEnabled } from "@tcf/core/flags";
import JsonLd from "@tcf/ui/ui/JsonLd";
import Breadcrumbs from "@tcf/ui/ui/Breadcrumbs";
import { SITE_URL } from "@tcf/core/site";

export async function generateStaticParams() {
  // Tracks with ANY learner-facing assessment (legacy quiz OR secure exam
  // bank) get a /quiz/[tech] route so secure-exam-only tracks like AI/ML
  // are not silently hidden from search engines.
  return (await getTracks())
    .filter((t) => hasTrackAssessment(t.slug))
    .map((t) => ({ tech: t.slug }));
}


// docs/seo-technical-policy.md §1 caps the title Google actually renders at
// 60 characters — measured AFTER the root layout appends " | The Code Fix".
// Every track fits the preferred wording except AI/ML, whose 29-character
// name pushes the rendered result to 84. For those, fall back to a shorter
// ABSOLUTE title (no suffix) rather than shipping one Google will truncate.
// Tracks that already fit keep their exact previous title, suffix included.
const TITLE_SUFFIX = " | The Code Fix";
const MAX_RENDERED_TITLE = 60;

function examPageTitle(
  trackTitle: string,
  isFinalExam: boolean
): Metadata["title"] {
  const preferred = isFinalExam
    ? `اختبار ${trackTitle} النهائي: 40 سؤالًا وشهادة مجانية`
    : `اختبار ${trackTitle}`;
  if ((preferred + TITLE_SUFFIX).length <= MAX_RENDERED_TITLE) return preferred;

  const fallbacks = isFinalExam
    ? [
        `اختبار ${trackTitle} النهائي — 40 سؤالًا`,
        `اختبار ${trackTitle} النهائي`,
      ]
    : [`اختبار ${trackTitle}`];
  const fitting = fallbacks.find((t) => t.length <= MAX_RENDERED_TITLE);
  return {
    absolute: fitting ?? `اختبار ${trackTitle}`.slice(0, MAX_RENDERED_TITLE),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tech: string }>;
}): Promise<Metadata> {
  const { tech } = await params;
  const track = await getTrack(tech);
  if (!track) return {};
  const isFinalExam = hasExamBank(tech);
  const title = examPageTitle(track.title, isFinalExam);
  // Only the lesson_quizzes policy requires finishing lesson quizzes first;
  // a final_exam_only track (AI/ML) must not advertise a gate it does not have.
  const needsLessonQuizzes =
    getExamPrerequisitePolicy(tech)?.mode === "lesson_quizzes";
  const description = isFinalExam
    ? needsLessonQuizzes
      ? `اختبار كود ${track.title} نهائي من 40 سؤالًا يغطي مفاهيم المسار، مع تصحيح آمن وشهادة مجانية بعد إكمال اختبارات الدروس.`
      : `اختبار كود ${track.title} نهائي من 40 سؤالًا يغطي مفاهيم المسار، مع تصحيح آمن على الخادم وشهادة موثّقة مجانية عند الاجتياز.`
    : `اختبر معلوماتك في ${track.title} بأسئلة اختيار من متعدّد، واحصل على شهادة إتمام مجانية قابلة للتحقّق من The Code Fix.`;
  return {
    title,
    description,
    keywords: [
      `اختبار كود ${track.title}`,
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
        <h1 className="mb-2 text-3xl font-bold">
          اختبار {track.title} النهائي — 40 سؤالًا
        </h1>
        <section className="mb-6 rounded-2xl border border-border bg-surface p-5">
          <h2 className="mb-2 text-lg font-bold">ماذا يتضمن الاختبار؟</h2>
          <ul className="list-disc space-y-1 ps-5 text-sm leading-relaxed text-muted">
            <li>40 سؤالًا تغطي المفاهيم الأساسية والتطبيق الصحيح لما تعلمته.</li>
            <li>تصحيح آمن على الخادم؛ الإجابات الصحيحة لا تُرسل مسبقًا للمتصفح.</li>
            <li>شهادة إتمام مجانية بعد استيفاء متطلبات المسار واجتياز الاختبار.</li>
          </ul>
          <p className="mt-3 text-sm text-muted">
            {getExamPrerequisitePolicy(tech)?.mode === "lesson_quizzes"
              ? "أكمل اختبار كل درس أساسي أولًا، ثم ابدأ الاختبار النهائي للحصول على شهادتك."
              : "يمكنك بدء الاختبار النهائي مباشرة بعد تسجيل الدخول؛ اجتيازه يمنحك الشهادة الموثّقة."}
          </p>
        </section>
        {/* ExamRunner uses useSession(), which needs the SessionProvider that
            only exists when auth is enabled (same gate as LessonQuiz). */}
        {isAuthEnabled() ? (
          <ExamRunner track={tech} trackTitle={track.title} />
        ) : (
          <p className="rounded-xl border border-border bg-surface/50 p-4 text-center text-sm text-muted">
            الاختبار النهائي والشهادة الموثّقة يتطلبان تسجيل الدخول، وهو غير مفعّل حاليًا.
          </p>
        )}
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

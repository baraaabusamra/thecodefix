import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTrack, getTracks } from "@tcf/content/tracks";
import { hasExamBank, hasTrackAssessment } from "@tcf/assessment/quiz-bank";
import { isAuthEnabled } from "@tcf/core/flags";
import Certificate from "@tcf/certificates/ui/Certificate";
import SecureCertificate from "@tcf/certificates/ui/SecureCertificate";

export async function generateStaticParams() {
  // Tracks with ANY learner-facing assessment (legacy quiz OR secure exam
  // bank) get a /certificate/[tech] route. The personalized certificate page
  // remains noindex; /quiz/[tech] is the indexable target.
  return (await getTracks())
    .filter((t) => hasTrackAssessment(t.slug))
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
  if (hasExamBank(tech)) {
    // SecureCertificate uses useSession(), which needs the SessionProvider
    // that only exists when auth is enabled (same gate as LessonQuiz).
    if (!isAuthEnabled()) {
      return (
        <div className="mx-auto max-w-xl px-4 py-24">
          <p className="rounded-xl border border-border bg-surface/50 p-4 text-center text-sm text-muted">
            الاختبار النهائي والشهادة الموثّقة يتطلبان تسجيل الدخول، وهو غير مفعّل حاليًا.
          </p>
        </div>
      );
    }
    return <SecureCertificate track={tech} trackTitle={track.title} />;
  }
  return <Certificate track={tech} trackTitle={track.title} authEnabled={isAuthEnabled()} />;
}

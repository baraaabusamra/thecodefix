import type { Metadata } from "next";
import { getTracks, getLessons } from "@tcf/content/tracks";
import { getJobs } from "@tcf/jobs/jobs";
import { hasTrackAssessment } from "@tcf/assessment/quiz-bank";
import { isAuthEnabled } from "@tcf/core/flags";
import AccountDashboard, {
  type TrackInfo,
  type JobLite,
} from "@tcf/progress/ui/AccountDashboard";

export const metadata: Metadata = {
  title: "حسابي",
  description: "تابع تقدّمك في المسارات، نتائج اختباراتك، وشهاداتك على The Code Fix.",
  // Personal dashboard — robots.txt already disallows /account; page-level
  // noindex keeps the URL itself out of the index too.
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const tracks: TrackInfo[] = await Promise.all(
    (await getTracks()).map(async (t) => ({
      slug: t.slug,
      title: t.title,
      icon: t.icon,
      lessonCount: (await getLessons(t.slug)).length,
      hasQuiz: hasTrackAssessment(t.slug),
    }))
  );
  // Slim job list for the opportunity radar (client matches by track).
  const jobs: JobLite[] = getJobs().map((j) => ({
    slug: j.slug,
    title: j.title,
    company: j.company,
    type: j.type,
    location: j.location,
    tags: j.tags,
  }));
  return <AccountDashboard tracks={tracks} jobs={jobs} authEnabled={isAuthEnabled()} />;
}

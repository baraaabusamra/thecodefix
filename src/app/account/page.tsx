import type { Metadata } from "next";
import { getTracks, getLessons } from "@/lib/content";
import { hasQuiz } from "@/lib/quiz";
import AccountDashboard, { type TrackInfo } from "@/components/AccountDashboard";

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
      hasQuiz: hasQuiz(t.slug),
    }))
  );
  return <AccountDashboard tracks={tracks} />;
}

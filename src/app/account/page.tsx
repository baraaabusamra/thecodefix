import type { Metadata } from "next";
import { getTracks, getLessons } from "@/lib/content";
import { hasQuiz } from "@/lib/quiz";
import AccountDashboard, { type TrackInfo } from "@/components/AccountDashboard";

export const metadata: Metadata = {
  title: "حسابي",
  description: "تابع تقدّمك في المسارات، نتائج اختباراتك، وشهاداتك على The Code Fix.",
};

export default function AccountPage() {
  const tracks: TrackInfo[] = getTracks().map((t) => ({
    slug: t.slug,
    title: t.title,
    icon: t.icon,
    lessonCount: getLessons(t.slug).length,
    hasQuiz: hasQuiz(t.slug),
  }));
  return <AccountDashboard tracks={tracks} />;
}

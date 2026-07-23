import type { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getCreatorByUserId,
  listSubmissionsByCreator,
  getCreatorStats,
  listNotifications,
} from "@/lib/creators";
import CreatorDashboard from "@/components/creators/CreatorDashboard";

export const metadata: Metadata = {
  title: "لوحة المبدع",
  description: "نظرة عامة على فيديوهاتك وإشعاراتك.",
};

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/creators/dashboard");

  const creator = await getCreatorByUserId(session.user.id);
  if (!creator) redirect("/creators/register");

  const [stats, submissions, notifications] = await Promise.all([
    getCreatorStats(creator.id),
    listSubmissionsByCreator(creator.id),
    listNotifications(session.user.id),
  ]);

  return (
    <CreatorDashboard
      stats={stats ?? { totalSubmissions: 0, approvedSubmissions: 0, rejectionRate: 0 }}
      submissions={submissions ?? []}
      notifications={notifications ?? []}
    />
  );
}

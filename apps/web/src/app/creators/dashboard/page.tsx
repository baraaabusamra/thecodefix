import type { Metadata } from "next";
import { auth } from "@tcf/identity/auth";
import { redirect } from "next/navigation";
import {
  resolveActiveCreator,
  listPostsByCreator,
  getCreatorStats,
  listNotifications,
} from "@tcf/creators/creators";
import CreatorDashboard from "@tcf/creators/ui/CreatorDashboard";
import PageSwitcher from "@tcf/creators/ui/PageSwitcher";

export const metadata: Metadata = {
  title: "لوحة المبدع",
  description: "نظرة عامة على منشوراتك وإشعاراتك.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/creators/dashboard");

  const { page } = await searchParams;
  const resolved = await resolveActiveCreator(session.user.id, page);
  if (!resolved) redirect("/creators/register");
  const { active, all } = resolved;

  const [stats, submissions, notifications] = await Promise.all([
    getCreatorStats(active.id),
    listPostsByCreator(active.id),
    listNotifications(session.user.id),
  ]);

  return (
    <CreatorDashboard
      creator={active}
      switcher={all.length > 1 ? <PageSwitcher pages={all} activeId={active.id} /> : null}
      stats={stats ?? { totalSubmissions: 0, approvedSubmissions: 0, rejectionRate: 0 }}
      submissions={submissions ?? []}
      notifications={notifications ?? []}
    />
  );
}

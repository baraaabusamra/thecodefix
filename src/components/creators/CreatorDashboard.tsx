import Link from "next/link";
import type { VideoSubmission, Notification } from "@/db/schema";
import type { CreatorStats } from "@/lib/creators";
import SubmissionStatusBadge from "./SubmissionStatusBadge";
import NotificationBell from "./NotificationBell";

type DashboardProps = {
  stats: CreatorStats;
  submissions: VideoSubmission[];
  notifications: Notification[];
};

export default function CreatorDashboard({ stats, submissions, notifications }: DashboardProps) {
  const approvalRate = stats.totalSubmissions > 0
    ? Math.round((stats.approvedSubmissions / stats.totalSubmissions) * 100)
    : 0;

  return (
    <div className="mx-auto flex max-w-4xl flex-col px-4 py-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">لوحة المبدع</h1>
          <p className="mt-1 text-sm text-muted">نظرة عامة على فيديوهاتك وإشعاراتك.</p>
        </div>
        <div className="flex items-center gap-3">
          <NotificationBell notifications={notifications} />
          <Link
            href="/creators/submit"
            className="btn-neon rounded-xl px-4 py-2 text-sm font-semibold"
          >
            + إرسال فيديو
          </Link>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="إجمالي الطلبات" value={stats.totalSubmissions} />
        <StatCard label="المعتمدة" value={stats.approvedSubmissions} />
        <StatCard label="معدل القبول" value={`${approvalRate}%`} />
        <StatCard label="قيد المراجعة" value={submissions.filter((s) => s.status === "pending").length} />
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-bold">آخر الفيديوهات</h2>
        {submissions.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            لم ترسل أي فيديو بعد.{' '}
            <Link href="/creators/submit" className="text-brand-cyan hover:underline">
              أرسل فيديو now
            </Link>
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {submissions.slice(0, 5).map((sub) => (
              <div key={sub.id} className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{sub.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {new Date(sub.createdAt).toLocaleDateString("ar-SA")}
                  </p>
                </div>
                <SubmissionStatusBadge
                  status={sub.status as "pending" | "approved" | "rejected" | "needs_revision"}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface/40 p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

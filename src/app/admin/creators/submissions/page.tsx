import type { Metadata } from "next";
import Link from "next/link";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { requireDb } from "@/db";
import { posts } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { Forbidden } from "../../_components/gates";
import {
  SUBMISSION_STATUS_LABELS,
  SUBMISSION_STATUS_TONES,
  fmtDate,
} from "../labels";

export const metadata: Metadata = {
  title: "طلبات المراجعة",
  robots: { index: false, follow: false },
};

type SubmissionStatus = "pending" | "approved" | "rejected" | "needs_revision";
const STATUSES = ["", "pending", "approved", "rejected", "needs_revision"] as const;

export default async function SubmissionsQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; saved?: string; error?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "creators:review")) return <Forbidden role={access.role} />;

  const { status, saved, error } = await searchParams;
  const db = requireDb();

  const conditions = [];
  if (status && STATUSES.includes(status as typeof STATUSES[number])) {
    conditions.push(eq(posts.status, status as SubmissionStatus));
  }

  const submissions = await db
    .select()
    .from(posts)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(posts.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">طلبات المراجعة</h1>
        <p className="mt-1 text-sm text-muted">
          مراجعة منشورات المبدعين — اعتماد، رفض، أو طلب تعديل.
        </p>
      </div>

      {saved && (
        <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-500">
          {saved === "approved" && "تم اعتماد المنشور."}
          {saved === "rejected" && "تم رفض المنشور."}
          {saved === "revision" && "تم طلب التعديل."}
          {saved === "deleted" && "تم الحذف."}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          تعذّرت العملية.
        </p>
      )}

      {submissions.length === 0 ? (
        <p className="text-sm text-muted">لا توجد طلبات مراجعة.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/40 text-right">
                <th className="px-4 py-3 font-semibold">العنوان</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">التاريخ</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {submissions.map((sub) => (
                <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-surface/20">
                  <td className="max-w-xs truncate px-4 py-3 font-medium">
                    {sub.title}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${SUBMISSION_STATUS_TONES[sub.status] ?? ""}`}
                    >
                      {SUBMISSION_STATUS_LABELS[sub.status] ?? sub.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {fmtDate(sub.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/creators/submissions/${sub.id}`}
                      className="text-brand-cyan hover:underline"
                    >
                      مراجعة
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

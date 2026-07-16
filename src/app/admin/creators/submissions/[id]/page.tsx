import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { requireDb } from "@/db";
import { videoSubmissions } from "@/db/schema";
import { Forbidden } from "../../../_components/gates";
import SubmissionReviewPanel from "@/components/creators/SubmissionReviewPanel";
import { fmtDate } from "../../labels";

export const metadata: Metadata = {
  title: "مراجعة الفيديو",
  robots: { index: false, follow: false },
};

export default async function ReviewDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "creators:review")) return <Forbidden role={access.role} />;

  const { id } = await params;
  const { saved } = await searchParams;
  const db = requireDb();

  const [submission] = await db
    .select()
    .from(videoSubmissions)
    .where(eq(videoSubmissions.id, id))
    .limit(1);
  if (!submission) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">مراجعة الفيديو</h1>
          <p className="mt-1 text-sm text-muted">
            أرسل {fmtDate(submission.createdAt)}
          </p>
        </div>
        <Link
          href="/admin/creators/submissions"
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-surface"
        >
          → كل الطلبات
        </Link>
      </div>

      {saved && (
        <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-500">
          {saved === "approved" && "تم اعتماد الفيديو بنجاح."}
          {saved === "rejected" && "تم رفض الفيديو."}
          {saved === "revision" && "تم طلب التعديل من المبدع."}
        </p>
      )}

      <SubmissionReviewPanel submission={submission} />
    </div>
  );
}

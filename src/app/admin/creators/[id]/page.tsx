import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { getCreator, listPostsByCreator } from "@/lib/creators";
import { Forbidden } from "../../_components/gates";
import NeedsDatabase from "../../_components/NeedsDatabase";
import SubmissionStatusBadge from "@/components/creators/SubmissionStatusBadge";
import { suspendCreator, activateCreator } from "../actions";
import {
  CREATOR_STATUS_LABELS,
  CREATOR_STATUS_TONES,
  fmtDate,
} from "../labels";

export const metadata: Metadata = {
  title: "تفاصيل المبدع",
  robots: { index: false, follow: false },
};

export default async function CreatorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "creators:review")) return <Forbidden role={access.role} />;

  const { id } = await params;
  const creator = await getCreator(id);
  if (!creator) notFound();

  const submissions = await listPostsByCreator(id);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{creator.displayName}</h1>
          <p className="mt-1 text-sm text-muted">
            {creator.userEmail && `${creator.userEmail} · `}
            سجّل {fmtDate(creator.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {creator.status === "active" ? (
            <form action={suspendCreator}>
              <input type="hidden" name="id" value={creator.id} />
              <button
                type="submit"
                className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
              >
                إيقاف الصفحة
              </button>
            </form>
          ) : (
            <form action={activateCreator}>
              <input type="hidden" name="id" value={creator.id} />
              <button
                type="submit"
                className="rounded-lg border border-green-500/40 px-4 py-2 text-sm font-semibold text-green-500 transition hover:bg-green-500/10"
              >
                إعادة تفعيل الصفحة
              </button>
            </form>
          )}
          <Link
            href="/admin/creators"
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-surface"
          >
            → كل المبدعين
          </Link>
        </div>
      </div>

      {/* Profile info */}
      <div className="rounded-xl border border-border bg-surface/40 p-5">
        <div className="flex items-start gap-4">
          {creator.avatar && (
            <Image
              src={creator.avatar}
              alt={creator.displayName}
              width={64}
              height={64}
              className="h-16 w-16 rounded-full object-cover"
              unoptimized
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold">{creator.displayName}</h2>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CREATOR_STATUS_TONES[creator.status] ?? ""}`}
              >
                {CREATOR_STATUS_LABELS[creator.status] ?? creator.status}
              </span>
            </div>
            {creator.bio && <p className="mt-1 text-sm text-muted">{creator.bio}</p>}
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div>
                <span className="text-muted">إجمالي الطلبات</span>
                <p className="font-semibold">{creator.totalSubmissions}</p>
              </div>
              <div>
                <span className="text-muted">المعتمدة</span>
                <p className="font-semibold">{creator.approvedSubmissions}</p>
              </div>
              {creator.website && (
                <a
                  href={creator.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-cyan hover:underline"
                >
                  الموقع الإلكتروني
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Submissions */}
      <div>
        <h2 className="mb-4 text-lg font-bold">المنشورات المرسلة</h2>
        {submissions === null ? (
          <NeedsDatabase />
        ) : submissions.length === 0 ? (
          <p className="text-sm text-muted">لم ينشر أي شيء بعد.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {submissions.map((sub) => (
              <Link
                key={sub.id}
                href={`/admin/creators/submissions/${sub.id}`}
                className="flex items-center justify-between gap-4 rounded-xl border border-border p-4 transition hover:bg-surface/20"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{sub.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    {fmtDate(sub.createdAt)}
                  </p>
                </div>
                <SubmissionStatusBadge
                  status={sub.status as "pending" | "approved" | "rejected" | "needs_revision"}
                />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

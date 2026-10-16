import type { Metadata } from "next";
import Link from "next/link";
import { resolveAdmin } from "@tcf/identity/admin-access";
import { can } from "@tcf/identity/rbac";
import { listCreators } from "@tcf/creators/creators";
import { Forbidden } from "../_components/gates";
import NeedsDatabase from "../_components/NeedsDatabase";
import {
  CREATOR_STATUS_LABELS,
  CREATOR_STATUS_TONES,
  fmtDate,
} from "./labels";

export const metadata: Metadata = {
  title: "المبدعون",
  robots: { index: false, follow: false },
};

export default async function CreatorsListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "creators:review")) return <Forbidden role={access.role} />;

  const { q, status } = await searchParams;
  const rows = await listCreators({
    status: status === "active" ? "active" : status === "suspended" ? "suspended" : undefined,
    search: q,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">المبدعون</h1>
        <p className="mt-1 text-sm text-muted">
          جميع منشئي المحتوى المسجلين في المنصة.
        </p>
      </div>

      {rows === null ? (
        <NeedsDatabase />
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted">لا يوجد مبدعون مسجلون بعد.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/40 text-right">
                <th className="px-4 py-3 font-semibold">الاسم</th>
                <th className="px-4 py-3 font-semibold">البريد</th>
                <th className="px-4 py-3 font-semibold">الحالة</th>
                <th className="px-4 py-3 font-semibold">الطلبات</th>
                <th className="px-4 py-3 font-semibold">المعتمدة</th>
                <th className="px-4 py-3 font-semibold">التسجيل</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {rows.map((creator) => (
                <tr key={creator.id} className="border-b border-border last:border-0 hover:bg-surface/20">
                  <td className="px-4 py-3 font-medium">{creator.displayName}</td>
                  <td className="px-4 py-3 text-muted">{creator.userEmail ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${CREATOR_STATUS_TONES[creator.status] ?? ""}`}
                    >
                      {CREATOR_STATUS_LABELS[creator.status] ?? creator.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">{creator.totalSubmissions}</td>
                  <td className="px-4 py-3">{creator.approvedSubmissions}</td>
                  <td className="px-4 py-3 text-muted">{fmtDate(creator.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/creators/${creator.id}`}
                      className="text-brand-cyan hover:underline"
                    >
                      التفاصيل
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

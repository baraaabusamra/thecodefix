import type { Metadata } from "next";
import Link from "next/link";
import { resolveAdmin } from "@tcf/identity/admin-access";
import { can } from "@tcf/identity/rbac";
import {
  listReviewLessons,
  type ReviewLessonRow,
} from "@tcf/admin/operations";
import { Forbidden } from "../../_components/gates";
import NeedsDatabase from "../../_components/NeedsDatabase";
import { LESSON_STATUS_LABELS, LESSON_STATUS_TONES, fmtDate } from "../labels";
import { setLessonWorkflow } from "@tcf/admin/actions/ops-content";

export const metadata: Metadata = {
  title: "إدارة المحتوى — العمليات",
  robots: { index: false, follow: false },
};

export default async function OperationsContentPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; saved?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "ops:manage")) return <Forbidden role={access.role} />;

  const { status, saved } = await searchParams;
  const rows = await listReviewLessons();
  // Operations can't open the content editor; show the edit link only to
  // roles that also hold content:edit (admin/owner/writer).
  const canEdit = can(access.role, "content:edit");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إدارة المحتوى</h1>
        <p className="mt-1 text-sm text-muted">
          سير عمل المراجعة: مسودة ← قيد المراجعة ← منشور ← موقوف. الموافقة أو
          الرفض مع ملاحظات للكاتب.
        </p>
      </div>

      {saved && (
        <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-500">
          تم تحديث حالة الدرس.
        </p>
      )}

      {rows === null ? (
        <NeedsDatabase />
      ) : (
        <ReviewTable rows={rows} status={status ?? ""} canEdit={canEdit} />
      )}

      <p className="text-xs text-muted">
        تشمل هذه القائمة دروس قاعدة البيانات فقط. الدروس الملفّية (داخل
        المستودع) تُدار من قسم المحتوى والتوثيق.
      </p>
    </div>
  );
}

function ReviewTable({
  rows,
  status,
  canEdit,
}: {
  rows: ReviewLessonRow[];
  status: string;
  canEdit: boolean;
}) {
  const filtered = status ? rows.filter((r) => r.status === status) : rows;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(LESSON_STATUS_LABELS).map(([v, label]) => (
          <Link key={v} href={`/admin/operations/content?status=${v}`}>
            <div
              className={`rounded-xl border bg-surface p-4 text-center transition hover:border-brand-purple/50 ${
                status === v ? "border-brand-purple" : "border-border"
              }`}
            >
              <div className="text-2xl font-extrabold text-brand-purple">
                {rows.filter((r) => r.status === v).length}
              </div>
              <div className="mt-1 text-xs text-muted">{label}</div>
            </div>
          </Link>
        ))}
      </div>

      {status && (
        <Link
          href="/admin/operations/content"
          className="inline-block text-sm text-brand-cyan hover:underline"
        >
          ✕ إلغاء التصفية ({LESSON_STATUS_LABELS[status] ?? status})
        </Link>
      )}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-3 py-2 text-start font-semibold">الدرس</th>
              <th className="px-3 py-2 text-start font-semibold">المسار</th>
              <th className="px-3 py-2 text-center font-semibold">الحالة</th>
              <th className="px-3 py-2 text-center font-semibold">آخر تحديث</th>
              <th className="px-3 py-2 text-start font-semibold">
                المراجعة والملاحظات
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border align-top">
                <td className="px-3 py-2 font-medium">
                  {canEdit ? (
                    <Link
                      href={`/admin/content/db/${r.id}`}
                      className="text-brand-cyan hover:underline"
                    >
                      {r.title}
                    </Link>
                  ) : (
                    r.title
                  )}
                  <div className="mt-0.5 font-mono text-[10px] text-muted" dir="ltr">
                    /{r.track}/{r.slug}
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">{r.track}</td>
                <td className="px-3 py-2 text-center">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap ${LESSON_STATUS_TONES[r.status] ?? ""}`}
                  >
                    {LESSON_STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-center whitespace-nowrap text-xs text-muted">
                  {fmtDate(r.updatedAt)}
                </td>
                <td className="px-3 py-2">
                  <form
                    action={setLessonWorkflow}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="id" value={r.id} />
                    <select
                      name="status"
                      defaultValue={r.status}
                      className="rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:border-brand-purple"
                    >
                      {Object.entries(LESSON_STATUS_LABELS).map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <input
                      name="reviewNotes"
                      defaultValue={r.reviewNotes ?? ""}
                      placeholder="ملاحظات المراجعة..."
                      className="w-44 rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:border-brand-purple"
                    />
                    <button className="rounded-lg border border-border px-2 py-1 text-xs font-semibold transition hover:bg-surface">
                      حفظ
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  {rows.length === 0
                    ? "لا توجد دروس في قاعدة البيانات بعد."
                    : "لا توجد دروس بهذه الحالة."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

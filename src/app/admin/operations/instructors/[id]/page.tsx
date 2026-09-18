import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import {
  getInstructor,
  getInstructorPayout,
  listInstructorTrackSlugs,
} from "@/lib/admin-operations";
import { getTracks } from "@/lib/content";
import { Forbidden } from "../../../_components/gates";
import ConfirmSubmit from "../../../_components/ConfirmSubmit";
import { INSTRUCTOR_STATUS_LABELS, fmtDate } from "../../labels";
import {
  updateInstructor,
  updateInstructorPayout,
  addInstructorTrack,
  removeInstructorTrack,
  deleteInstructor,
} from "../actions";

export const metadata: Metadata = {
  title: "ملف المحاضر",
  robots: { index: false, follow: false },
};

const inputCls =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-purple";

export default async function InstructorDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "ops:manage")) return <Forbidden role={access.role} />;

  const { id } = await params;
  const { saved, error } = await searchParams;
  const instructor = await getInstructor(id);
  if (!instructor) notFound();

  // Finance data is only ever queried for roles holding billing:manage —
  // the operations role never receives payout fields in any payload.
  const canFinance = can(access.role, "billing:manage");
  const payout = canFinance ? await getInstructorPayout(id) : null;

  const [ownedTracks, allTracks] = await Promise.all([
    listInstructorTrackSlugs(id),
    getTracks(),
  ]);
  const trackTitle = new Map(allTracks.map((t) => [t.slug, t.title]));
  const available = allTracks.filter((t) => !ownedTracks.includes(t.slug));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{instructor.name}</h1>
          <p className="mt-1 text-sm text-muted">
            أُضيف {fmtDate(instructor.createdAt)} · آخر تحديث{" "}
            {fmtDate(instructor.updatedAt)}
          </p>
        </div>
        <Link
          href="/admin/operations/instructors"
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-surface"
        >
          → كل المحاضرين
        </Link>
      </div>

      {saved && (
        <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-500">
          {saved === "payout" ? "تم حفظ بيانات الدفع." : "تم الحفظ."}
        </p>
      )}

      {error === "encryption" && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          لم تُحفظ بيانات الدفع: التشفير غير مهيّأ على الخادم (ENCRYPTION_KEY). لم يُكتب أي شيء.
        </p>
      )}

      {/* Contact info, status & notes */}
      <form
        action={updateInstructor}
        className="rounded-xl border border-border bg-surface/40 p-5"
      >
        <input type="hidden" name="id" value={instructor.id} />
        <h2 className="font-bold">بيانات المحاضر</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs text-muted">
            الاسم
            <input name="name" required defaultValue={instructor.name} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            التخصص
            <input name="specialty" defaultValue={instructor.specialty} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            الحالة
            <select name="status" defaultValue={instructor.status} className={inputCls}>
              {Object.entries(INSTRUCTOR_STATUS_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            تاريخ آخر محتوى
            <input
              name="lastContentAt"
              type="date"
              defaultValue={
                instructor.lastContentAt
                  ? instructor.lastContentAt.toISOString().slice(0, 10)
                  : ""
              }
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            البريد الإلكتروني
            <input name="email" type="email" dir="ltr" defaultValue={instructor.email ?? ""} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted">
            الهاتف
            <input name="phone" dir="ltr" defaultValue={instructor.phone ?? ""} className={inputCls} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
            رابط العقد (Google Drive أو غيره)
            <input
              name="contractUrl"
              type="url"
              dir="ltr"
              placeholder="https://..."
              defaultValue={instructor.contractUrl ?? ""}
              className={inputCls}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
            ملاحظات
            <textarea name="notes" rows={3} defaultValue={instructor.notes ?? ""} className={inputCls} />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button className="rounded-lg bg-brand-purple px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90">
            حفظ
          </button>
          {instructor.contractUrl && (
            <a
              href={instructor.contractUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-brand-cyan hover:underline"
            >
              📄 عرض العقد
            </a>
          )}
        </div>
      </form>

      {/* Courses (tracks) owned by this instructor */}
      <section className="rounded-xl border border-border bg-surface/40 p-5">
        <h2 className="font-bold">مساراته التعليمية</h2>
        <ul className="mt-3 space-y-2">
          {ownedTracks.map((slug) => (
            <li
              key={slug}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <span>{trackTitle.get(slug) ?? slug}</span>
              <form action={removeInstructorTrack}>
                <input type="hidden" name="id" value={instructor.id} />
                <input type="hidden" name="track" value={slug} />
                <ConfirmSubmit
                  label="إزالة"
                  title="إزالة المسار"
                  message={`سيتم فك ربط المسار "${trackTitle.get(slug) ?? slug}" عن هذا المحاضر.`}
                  confirmLabel="نعم، أزل"
                  className="rounded-lg px-2 py-1 text-xs text-red-500 transition hover:bg-red-500/10"
                />
              </form>
            </li>
          ))}
          {ownedTracks.length === 0 && (
            <li className="text-sm text-muted">لا توجد مسارات مرتبطة بعد.</li>
          )}
        </ul>
        {available.length > 0 && (
          <form action={addInstructorTrack} className="mt-3 flex gap-2">
            <input type="hidden" name="id" value={instructor.id} />
            <select name="track" className={`flex-1 ${inputCls}`}>
              {available.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.title}
                </option>
              ))}
            </select>
            <button className="rounded-lg border border-brand-purple/50 px-4 py-2 text-sm font-semibold text-brand-purple transition hover:bg-brand-purple/10">
              ربط مسار
            </button>
          </form>
        )}
      </section>

      {/* Finance — rendered ONLY for roles with billing:manage (admin/owner) */}
      {canFinance && (
        <form
          action={updateInstructorPayout}
          className="rounded-xl border border-yellow-500/30 bg-surface/40 p-5"
        >
          <input type="hidden" name="id" value={instructor.id} />
          <h2 className="font-bold">
            بيانات الدفع{" "}
            <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-bold text-yellow-500">
              للمشرفين فقط
            </span>
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-xs text-muted">
              طريقة الدفع
              <input
                name="payoutMethod"
                placeholder="تحويل بنكي، PayPal، ..."
                defaultValue={payout?.payoutMethod ?? ""}
                className={inputCls}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              البيانات البنكية
              <textarea
                name="bankDetails"
                rows={2}
                dir="ltr"
                defaultValue={payout?.bankDetails ?? ""}
                className={inputCls}
              />
            </label>
          </div>
          <button className="mt-4 rounded-lg bg-brand-purple px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90">
            حفظ بيانات الدفع
          </button>
        </form>
      )}

      {/* Danger zone */}
      <form
        action={deleteInstructor}
        className="flex items-center justify-between rounded-xl border border-red-500/30 p-5"
      >
        <input type="hidden" name="id" value={instructor.id} />
        <div>
          <h2 className="font-bold text-red-500">حذف المحاضر</h2>
          <p className="mt-1 text-xs text-muted">
            يحذف الملف وروابط المسارات نهائيًا. لا يمكن التراجع.
          </p>
        </div>
        <ConfirmSubmit
          label="🗑️ حذف"
          title="حذف المحاضر"
          message={`سيتم حذف "${instructor.name}" وكل بياناته نهائيًا.`}
          className="rounded-lg border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
        />
      </form>
    </div>
  );
}

import type { Metadata } from "next";
import { auth } from "@/auth";
import { resolveAdmin } from "@/lib/admin-access";
import { can, ROLE_LABELS } from "@/lib/rbac";
import {
  listReports,
  summarizeByMember,
  type ReportRow,
} from "@/lib/admin-reports";
import { Forbidden } from "../_components/gates";
import NeedsDatabase from "../_components/NeedsDatabase";
import ConfirmSubmit from "../_components/ConfirmSubmit";
import { submitReport, reviewReport, deleteReport } from "./actions";
import {
  REPORT_CATEGORY_LABELS,
  REPORT_CATEGORY_ICONS,
  REPORT_STATUS_LABELS,
  REPORT_STATUS_TONES,
  fmtReportDate,
} from "./labels";

export const metadata: Metadata = {
  title: "تقارير الفريق",
  robots: { index: false, follow: false },
};

const SAVED_MESSAGES: Record<string, string> = {
  submitted: "تم إرسال تقريرك — بانتظار موافقة مسؤول العمليات.",
  approved: "تم قبول التقرير.",
  rejected: "تم رفض التقرير مع الملاحظة.",
  deleted: "تم حذف التقرير.",
};

const ERROR_MESSAGES: Record<string, string> = {
  invalid: "تعذّر الإرسال — التصنيف والعنوان والتفاصيل حقول مطلوبة.",
  self: "لا يمكنك الموافقة على تقريرك بنفسك — يراجعه المشرف أو المالك.",
  noaccount: "وضع مفتاح الإدارة لا يملك حساب مستخدم لنسب التقرير إليه — سجّل دخولك بحسابك.",
  missing: "التقرير غير موجود.",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; member?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  const canSubmit = can(access.role, "reports:submit");
  const canReview = can(access.role, "reports:review");
  if (!canSubmit && !canReview) return <Forbidden role={access.role} />;

  const { saved, error, member } = await searchParams;
  const session = await auth();
  const myId = session?.user?.id ?? null;

  // Reviewers see everyone's reports; members see only their own.
  const rows = canReview
    ? await listReports()
    : myId
      ? await listReports({ userId: myId })
      : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">🗒️ تقارير الفريق</h1>
        <p className="mt-1 text-sm text-muted">
          {canReview
            ? "كل عضو يسجّل ما أنجزه، وتمرّ التقارير عليك للموافقة — والمالك يرى الصورة كاملة."
            : "سجّل ما أنجزته (سوشيال ميديا، بودكاست، إيفنتات، تصوير، محتوى، تصميم…) ليراجعه مسؤول العمليات."}
        </p>
      </div>

      {saved && SAVED_MESSAGES[saved] && (
        <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-500">
          {SAVED_MESSAGES[saved]}
        </p>
      )}
      {error && ERROR_MESSAGES[error] && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          {ERROR_MESSAGES[error]}
        </p>
      )}

      {rows === null ? (
        <NeedsDatabase />
      ) : (
        <>
          {canReview && <ReviewQueue rows={rows} myId={myId} role={access.role} />}
          {canReview && <MemberOverview rows={rows} activeMember={member} />}
          {canSubmit && <SubmitForm />}
          <ReportsList
            rows={
              canReview && member
                ? rows.filter((r) => r.authorId === member)
                : rows
            }
            canReview={canReview}
            myId={myId}
            heading={canReview ? "كل التقارير" : "تقاريري"}
          />
        </>
      )}
    </div>
  );
}

/* ── Review queue: pending reports with approve/reject ── */
function ReviewQueue({
  rows,
  myId,
  role,
}: {
  rows: ReportRow[];
  myId: string | null;
  role: string;
}) {
  const pending = rows.filter((r) => r.status === "pending");
  if (pending.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">
        ⏳ بانتظار موافقتك ({pending.length})
      </h2>
      <div className="space-y-4">
        {pending.map((r) => {
          const isMine = !!myId && r.authorId === myId;
          const blockedSelf = isMine && role !== "admin" && role !== "owner";
          return (
            <div
              key={r.id}
              className="rounded-2xl border border-yellow-500/30 bg-surface p-5"
            >
              <ReportHeader r={r} showAuthor />
              <p className="mt-3 whitespace-pre-wrap text-sm">{r.details}</p>
              <ReportLinks links={r.links} />
              {blockedSelf ? (
                <p className="mt-4 rounded-lg bg-background px-3 py-2 text-xs text-muted">
                  هذا تقريرك أنت — يعتمده المشرف أو المالك.
                </p>
              ) : (
                <form
                  action={reviewReport}
                  className="mt-4 flex flex-wrap items-end gap-2 border-t border-border pt-4"
                >
                  <input type="hidden" name="id" value={r.id} />
                  <label className="min-w-52 flex-1 text-xs text-muted">
                    ملاحظة المراجعة (إلزامية عند الرفض عمليًّا)
                    <textarea
                      name="reviewNote"
                      rows={1}
                      className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground outline-none focus:border-brand-purple/60"
                    />
                  </label>
                  <button
                    name="decision"
                    value="approved"
                    className="rounded-lg border border-green-500/50 bg-green-500/10 px-4 py-2 text-sm font-semibold text-green-500 transition hover:bg-green-500/20"
                  >
                    ✓ موافقة
                  </button>
                  <button
                    name="decision"
                    value="rejected"
                    className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20"
                  >
                    ✗ رفض
                  </button>
                </form>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Per-member rollup for the manager/owner ── */
function MemberOverview({
  rows,
  activeMember,
}: {
  rows: ReportRow[];
  activeMember?: string;
}) {
  const summary = summarizeByMember(rows);
  if (summary.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">👥 نشاط الأعضاء</h2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-xs text-muted">
            <tr>
              <th className="px-4 py-2 text-start">العضو</th>
              <th className="px-4 py-2 text-start">الدور</th>
              <th className="px-4 py-2 text-center">التقارير</th>
              <th className="px-4 py-2 text-center">بالانتظار</th>
              <th className="px-4 py-2 text-center">مقبول</th>
              <th className="px-4 py-2 text-center">مرفوض</th>
              <th className="px-4 py-2 text-start">آخر تقرير</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {summary.map((m) => (
              <tr key={m.authorId} className="border-t border-border">
                <td className="px-4 py-2 font-semibold">
                  {m.authorName ?? "—"}
                </td>
                <td className="px-4 py-2 text-muted">
                  {m.authorRole ? ROLE_LABELS[m.authorRole] : "—"}
                </td>
                <td className="px-4 py-2 text-center font-semibold">
                  {m.total}
                </td>
                <td className="px-4 py-2 text-center text-yellow-500">
                  {m.pending}
                </td>
                <td className="px-4 py-2 text-center text-green-500">
                  {m.approved}
                </td>
                <td className="px-4 py-2 text-center text-red-400">
                  {m.rejected}
                </td>
                <td className="px-4 py-2 text-muted">
                  {fmtReportDate(m.lastReportAt)}
                </td>
                <td className="px-4 py-2 text-end">
                  {activeMember === m.authorId ? (
                    <a href="/admin/reports" className="text-xs text-accent underline">
                      إلغاء التصفية
                    </a>
                  ) : (
                    <a
                      href={`/admin/reports?member=${m.authorId}`}
                      className="text-xs text-accent underline"
                    >
                      تقاريره فقط
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/* ── Submission form ── */
function SubmitForm() {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-lg font-bold">➕ سجّل ما أنجزت</h2>
      <form action={submitReport} className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          التصنيف
          <select
            name="category"
            required
            className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-brand-purple/60"
          >
            {Object.entries(REPORT_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {REPORT_CATEGORY_ICONS[value as ReportRow["category"]]} {label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          تاريخ العمل
          <input
            type="date"
            name="workDate"
            defaultValue={today}
            className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-brand-purple/60"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          العنوان
          <input
            name="title"
            required
            maxLength={140}
            placeholder="مثال: 3 منشورات LinkedIn عن مقال Merge Conflict"
            className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm outline-none placeholder:text-muted/60 focus:border-brand-purple/60"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          التفاصيل — ماذا عملت وما النتيجة؟
          <textarea
            name="details"
            required
            rows={4}
            className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-brand-purple/60"
          />
        </label>
        <label className="text-sm sm:col-span-2">
          روابط الأعمال (اختياري — رابط في كل سطر)
          <textarea
            name="links"
            rows={2}
            dir="ltr"
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm outline-none placeholder:text-muted/60 focus:border-brand-purple/60"
          />
        </label>
        <div className="sm:col-span-2">
          <button className="btn-neon px-6 py-2 text-sm">إرسال التقرير</button>
        </div>
      </form>
    </section>
  );
}

/* ── Full list (members: own; reviewers: everyone, filterable) ── */
function ReportsList({
  rows,
  canReview,
  myId,
  heading,
}: {
  rows: ReportRow[];
  canReview: boolean;
  myId: string | null;
  heading: string;
}) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-bold">📋 {heading} ({rows.length})</h2>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
          لا توجد تقارير بعد.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => {
            const canDelete =
              canReview || (!!myId && r.authorId === myId && r.status === "pending");
            return (
              <details
                key={r.id}
                className="rounded-xl border border-border bg-surface"
              >
                <summary className="cursor-pointer select-none px-4 py-3">
                  <div className="inline-flex w-[calc(100%-1.5rem)] flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">
                      {REPORT_CATEGORY_ICONS[r.category]} {r.title}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted">
                      {canReview && <span>{r.authorName ?? "—"}</span>}
                      <span>{fmtReportDate(r.workDate)}</span>
                      <span
                        className={`rounded-full border px-2 py-0.5 font-semibold ${REPORT_STATUS_TONES[r.status]}`}
                      >
                        {REPORT_STATUS_LABELS[r.status]}
                      </span>
                    </span>
                  </div>
                </summary>
                <div className="border-t border-border px-4 py-3">
                  <ReportHeader r={r} showAuthor={canReview} />
                  <p className="mt-2 whitespace-pre-wrap text-sm">{r.details}</p>
                  <ReportLinks links={r.links} />
                  {r.reviewNote && (
                    <p className="mt-3 rounded-lg bg-background px-3 py-2 text-sm text-muted">
                      💬 ملاحظة المراجع{r.reviewerName ? ` (${r.reviewerName})` : ""}:{" "}
                      {r.reviewNote}
                    </p>
                  )}
                  {canDelete && (
                    <form action={deleteReport} className="mt-3">
                      <input type="hidden" name="id" value={r.id} />
                      <ConfirmSubmit
                        label="🗑 حذف التقرير"
                        message="سيُحذف هذا التقرير نهائيًّا."
                        className="text-xs text-red-400 hover:underline"
                      />
                    </form>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ── Shared bits ── */
function ReportHeader({ r, showAuthor }: { r: ReportRow; showAuthor: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
      {showAuthor && (
        <span className="font-semibold text-foreground">
          {r.authorName ?? r.authorEmail ?? "—"}
        </span>
      )}
      {showAuthor && r.authorRole && <span>{ROLE_LABELS[r.authorRole]}</span>}
      <span className="rounded-full border border-border px-2 py-0.5">
        {REPORT_CATEGORY_ICONS[r.category]} {REPORT_CATEGORY_LABELS[r.category]}
      </span>
      <span>تاريخ العمل: {fmtReportDate(r.workDate)}</span>
      <span>أُرسل: {fmtReportDate(r.createdAt)}</span>
    </div>
  );
}

function ReportLinks({ links }: { links: string | null }) {
  if (!links) return null;
  const urls = links
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => /^https?:\/\//.test(l));
  if (urls.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {urls.map((u) => (
        <a
          key={u}
          href={u}
          target="_blank"
          rel="noopener noreferrer"
          dir="ltr"
          className="max-w-72 truncate rounded-lg border border-border bg-background px-2 py-1 text-xs text-accent underline"
        >
          {u}
        </a>
      ))}
    </div>
  );
}

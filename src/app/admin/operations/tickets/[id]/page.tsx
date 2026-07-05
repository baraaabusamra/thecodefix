import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import {
  getTicket,
  listTicketReplies,
  listTeamMembers,
} from "@/lib/admin-operations";
import { Forbidden } from "../../../_components/gates";
import ConfirmSubmit from "../../../_components/ConfirmSubmit";
import {
  TICKET_STATUS_LABELS,
  TICKET_PRIORITY_LABELS,
  fmtDate,
} from "../../labels";
import { updateTicket, addTicketReply, deleteTicket } from "../actions";

export const metadata: Metadata = {
  title: "تفاصيل التذكرة",
  robots: { index: false, follow: false },
};

const inputCls =
  "rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-purple";

export default async function TicketDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "ops:manage")) return <Forbidden role={access.role} />;

  const { id } = await params;
  const { saved } = await searchParams;
  const ticket = await getTicket(id);
  if (!ticket) notFound();

  const [replies, team] = await Promise.all([
    listTicketReplies(id),
    listTeamMembers(),
  ]);
  const requester =
    ticket.requesterName ?? ticket.requesterEmail ?? ticket.requesterUserEmail;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{ticket.subject}</h1>
          <p className="mt-1 text-sm text-muted">
            {requester ? `من ${requester} · ` : ""}فُتحت{" "}
            {fmtDate(ticket.createdAt)} · آخر تحديث {fmtDate(ticket.updatedAt)}
          </p>
        </div>
        <Link
          href="/admin/operations/tickets"
          className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-surface"
        >
          → كل التذاكر
        </Link>
      </div>

      {saved && (
        <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-500">
          {saved === "reply" ? "تمت إضافة الرد." : "تم الحفظ."}
        </p>
      )}

      {/* Status / priority / assignee */}
      <form
        action={updateTicket}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface/40 p-5"
      >
        <input type="hidden" name="id" value={ticket.id} />
        <label className="flex flex-col gap-1 text-xs text-muted">
          الحالة
          <select name="status" defaultValue={ticket.status} className={inputCls}>
            {Object.entries(TICKET_STATUS_LABELS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          الأولوية
          <select name="priority" defaultValue={ticket.priority} className={inputCls}>
            {Object.entries(TICKET_PRIORITY_LABELS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted">
          المسؤول
          <select
            name="assigneeId"
            defaultValue={ticket.assigneeId ?? ""}
            className={inputCls}
          >
            <option value="">غير معيّن</option>
            {team.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name ?? m.email ?? m.id}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-lg bg-brand-purple px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90">
          حفظ
        </button>
      </form>

      {/* Original request + thread */}
      <section className="space-y-3">
        {ticket.body && (
          <div className="rounded-xl border border-border bg-surface/40 p-4">
            <p className="text-xs font-bold text-muted">الطلب الأصلي</p>
            <p className="mt-2 text-sm whitespace-pre-wrap break-words">
              {ticket.body}
            </p>
          </div>
        )}

        {replies.map((r) => (
          <div
            key={r.id}
            className={`rounded-xl border p-4 ${
              r.internal
                ? "border-yellow-500/30 bg-yellow-500/5"
                : "border-border bg-surface/40"
            }`}
          >
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="font-bold">{r.authorName ?? "عضو الفريق"}</span>
              <span>{fmtDate(r.createdAt)}</span>
              {r.internal && (
                <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 font-bold text-yellow-500">
                  ملاحظة داخلية
                </span>
              )}
            </p>
            <p className="mt-2 text-sm whitespace-pre-wrap break-words">
              {r.body}
            </p>
          </div>
        ))}
        {replies.length === 0 && !ticket.body && (
          <p className="text-sm text-muted">لا توجد ردود بعد.</p>
        )}
      </section>

      {/* Reply form */}
      <form
        action={addTicketReply}
        className="rounded-xl border border-border bg-surface/40 p-5"
      >
        <input type="hidden" name="ticketId" value={ticket.id} />
        <h2 className="font-bold">إضافة رد</h2>
        <textarea
          name="body"
          rows={4}
          required
          placeholder="اكتب ردك..."
          className={`mt-3 w-full ${inputCls}`}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="internal" className="accent-brand-purple" />
            ملاحظة داخلية (لا تظهر لصاحب التذكرة)
          </label>
          <button className="rounded-lg bg-brand-purple px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90">
            إرسال
          </button>
        </div>
      </form>

      {/* Danger zone */}
      <form
        action={deleteTicket}
        className="flex items-center justify-between rounded-xl border border-red-500/30 p-5"
      >
        <input type="hidden" name="id" value={ticket.id} />
        <div>
          <h2 className="font-bold text-red-500">حذف التذكرة</h2>
          <p className="mt-1 text-xs text-muted">
            يحذف التذكرة وكل الردود نهائيًا. لا يمكن التراجع.
          </p>
        </div>
        <ConfirmSubmit
          label="🗑️ حذف"
          title="حذف التذكرة"
          message={`سيتم حذف التذكرة "${ticket.subject}" وكل ردودها نهائيًا.`}
          className="rounded-lg border border-red-500/50 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-500/10"
        />
      </form>
    </div>
  );
}

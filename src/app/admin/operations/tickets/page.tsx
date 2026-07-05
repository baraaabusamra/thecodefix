import type { Metadata } from "next";
import Link from "next/link";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { listTickets, type TicketRow } from "@/lib/admin-operations";
import { Forbidden } from "../../_components/gates";
import NeedsDatabase from "../../_components/NeedsDatabase";
import {
  TICKET_STATUS_LABELS,
  TICKET_STATUS_TONES,
  TICKET_PRIORITY_LABELS,
  TICKET_PRIORITY_TONES,
  fmtDate,
} from "../labels";
import { createTicket } from "./actions";

export const metadata: Metadata = {
  title: "تذاكر الدعم",
  robots: { index: false, follow: false },
};

export default async function TicketsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; saved?: string; error?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "ops:manage")) return <Forbidden role={access.role} />;

  const { q, status, saved, error } = await searchParams;
  const rows = await listTickets();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">تذاكر الدعم</h1>
        <p className="mt-1 text-sm text-muted">
          متابعة طلبات الدعم: الأولوية، الحالة، والمسؤول عن كل تذكرة.
        </p>
      </div>

      {saved === "deleted" && (
        <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-500">
          تم حذف التذكرة.
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          تعذّر إنشاء التذكرة — الموضوع مطلوب.
        </p>
      )}

      {rows === null ? (
        <NeedsDatabase />
      ) : (
        <TicketsTable rows={rows} query={q ?? ""} status={status ?? ""} />
      )}
    </div>
  );
}

function TicketsTable({
  rows,
  query,
  status,
}: {
  rows: TicketRow[];
  query: string;
  status: string;
}) {
  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (status && r.status !== status) return false;
    if (!q) return true;
    return (
      r.subject.toLowerCase().includes(q) ||
      (r.requesterName ?? "").toLowerCase().includes(q) ||
      (r.requesterEmail ?? r.requesterUserEmail ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="الكل" value={rows.length} />
        {Object.entries(TICKET_STATUS_LABELS).map(([v, label]) => (
          <Stat
            key={v}
            label={label}
            value={rows.filter((r) => r.status === v).length}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form
          action="/admin/operations/tickets"
          className="flex max-w-lg flex-1 gap-2"
        >
          <input
            name="q"
            defaultValue={query}
            placeholder="ابحث بالموضوع أو المستخدم..."
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-purple"
          />
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border border-border bg-surface px-2 py-2 text-sm outline-none focus:border-brand-purple"
          >
            <option value="">كل الحالات</option>
            {Object.entries(TICKET_STATUS_LABELS).map(([v, label]) => (
              <option key={v} value={v}>
                {label}
              </option>
            ))}
          </select>
          <button className="rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
            بحث
          </button>
        </form>

        <details className="relative">
          <summary className="cursor-pointer rounded-lg border border-brand-purple/50 px-4 py-2 text-sm font-semibold text-brand-purple transition hover:bg-brand-purple/10">
            + تذكرة جديدة
          </summary>
          <form
            action={createTicket}
            className="absolute start-0 z-10 mt-2 flex w-80 flex-col gap-2 rounded-xl border border-border bg-background p-4 shadow-xl"
          >
            <input
              name="subject"
              required
              placeholder="موضوع التذكرة"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-purple"
            />
            <input
              name="requesterEmail"
              type="email"
              dir="ltr"
              placeholder="بريد صاحب الطلب (اختياري)"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-purple"
            />
            <textarea
              name="body"
              rows={3}
              placeholder="وصف المشكلة..."
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-purple"
            />
            <select
              name="priority"
              defaultValue="normal"
              className="rounded-lg border border-border bg-surface px-2 py-2 text-sm outline-none focus:border-brand-purple"
            >
              {Object.entries(TICKET_PRIORITY_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <button className="rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
              إنشاء
            </button>
          </form>
        </details>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">الموضوع</th>
              <th className="px-4 py-3 text-start font-semibold">المستخدم</th>
              <th className="px-4 py-3 text-center font-semibold">الأولوية</th>
              <th className="px-4 py-3 text-center font-semibold">الحالة</th>
              <th className="px-4 py-3 text-start font-semibold">المسؤول</th>
              <th className="px-4 py-3 text-center font-semibold">آخر تحديث</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/operations/tickets/${r.id}`}
                    className="font-medium text-brand-cyan hover:underline"
                  >
                    {r.subject}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.requesterName ??
                    r.requesterEmail ??
                    r.requesterUserEmail ?? (
                      <span className="text-muted">—</span>
                    )}
                </td>
                <td
                  className={`px-4 py-3 text-center text-xs font-bold ${TICKET_PRIORITY_TONES[r.priority] ?? ""}`}
                >
                  {TICKET_PRIORITY_LABELS[r.priority] ?? r.priority}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap ${TICKET_STATUS_TONES[r.status] ?? ""}`}
                  >
                    {TICKET_STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.assigneeName ?? <span className="text-muted">غير معيّن</span>}
                </td>
                <td className="px-4 py-3 text-center text-xs text-muted">
                  {fmtDate(r.updatedAt)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  {rows.length === 0 ? "لا توجد تذاكر بعد." : "لا نتائج للبحث."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 text-center">
      <div className="text-2xl font-extrabold text-brand-purple">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { resolveAdmin } from "@tcf/identity/admin-access";
import { can } from "@tcf/identity/rbac";
import { listInstructors, type InstructorRow } from "@tcf/admin/operations";
import { Forbidden } from "../../_components/gates";
import NeedsDatabase from "../../_components/NeedsDatabase";
import {
  INSTRUCTOR_STATUS_LABELS,
  INSTRUCTOR_STATUS_TONES,
  fmtDate,
} from "../labels";
import { createInstructor } from "@tcf/admin/actions/ops-instructors";

export const metadata: Metadata = {
  title: "إدارة المحاضرين",
  robots: { index: false, follow: false },
};

export default async function InstructorsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; saved?: string; error?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "ops:manage")) return <Forbidden role={access.role} />;

  const { q, status, saved, error } = await searchParams;
  const all = await listInstructors();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">إدارة المحاضرين</h1>
        <p className="mt-1 text-sm text-muted">
          متابعة المحاضرين: التواصل، التعاقد، والمحتوى المنشور.
        </p>
      </div>

      {saved === "deleted" && (
        <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-500">
          تم حذف المحاضر.
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          تعذّر الحفظ — تأكد من إدخال الاسم.
        </p>
      )}

      {all === null ? (
        <NeedsDatabase />
      ) : (
        <InstructorsTable rows={all} query={q ?? ""} status={status ?? ""} />
      )}
    </div>
  );
}

function InstructorsTable({
  rows,
  query,
  status,
}: {
  rows: InstructorRow[];
  query: string;
  status: string;
}) {
  const q = query.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (status && r.status !== status) return false;
    if (!q) return true;
    return (
      r.name.toLowerCase().includes(q) ||
      r.specialty.toLowerCase().includes(q) ||
      (r.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="الكل" value={rows.length} />
        <Stat
          label={INSTRUCTOR_STATUS_LABELS.contacting}
          value={rows.filter((r) => r.status === "contacting").length}
        />
        <Stat
          label={INSTRUCTOR_STATUS_LABELS.active}
          value={rows.filter((r) => r.status === "active").length}
        />
        <Stat
          label={INSTRUCTOR_STATUS_LABELS.paused}
          value={rows.filter((r) => r.status === "paused").length}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <form
          action="/admin/operations/instructors"
          className="flex max-w-lg flex-1 gap-2"
        >
          <input
            name="q"
            defaultValue={query}
            placeholder="ابحث بالاسم أو التخصص..."
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-purple"
          />
          <select
            name="status"
            defaultValue={status}
            className="rounded-lg border border-border bg-surface px-2 py-2 text-sm outline-none focus:border-brand-purple"
          >
            <option value="">كل الحالات</option>
            {Object.entries(INSTRUCTOR_STATUS_LABELS).map(([v, label]) => (
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
            + إضافة محاضر
          </summary>
          <form
            action={createInstructor}
            className="absolute start-0 z-10 mt-2 flex w-72 flex-col gap-2 rounded-xl border border-border bg-background p-4 shadow-xl"
          >
            <input
              name="name"
              required
              placeholder="اسم المحاضر"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-purple"
            />
            <input
              name="specialty"
              placeholder="التخصص (مثال: JavaScript)"
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-purple"
            />
            <select
              name="status"
              defaultValue="contacting"
              className="rounded-lg border border-border bg-surface px-2 py-2 text-sm outline-none focus:border-brand-purple"
            >
              {Object.entries(INSTRUCTOR_STATUS_LABELS).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
            <button className="rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
              إضافة
            </button>
          </form>
        </details>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">الاسم</th>
              <th className="px-4 py-3 text-start font-semibold">التخصص</th>
              <th className="px-4 py-3 text-center font-semibold">الحالة</th>
              <th className="px-4 py-3 text-center font-semibold">آخر محتوى</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/operations/instructors/${r.id}`}
                    className="font-medium text-brand-cyan hover:underline"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="px-4 py-3">{r.specialty || "—"}</td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${INSTRUCTOR_STATUS_TONES[r.status] ?? ""}`}
                  >
                    {INSTRUCTOR_STATUS_LABELS[r.status] ?? r.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-center text-xs text-muted">
                  {fmtDate(r.lastContentAt)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  {rows.length === 0 ? "لا يوجد محاضرون بعد." : "لا نتائج للبحث."}
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

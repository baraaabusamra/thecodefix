import type { Metadata } from "next";
import { listUsers, type AdminUserRow } from "@/lib/admin-users";
import { resolveAdmin } from "@/lib/admin-access";
import { can, ROLE_LABELS, ROLES, type Role } from "@/lib/rbac";
import { Forbidden } from "../_components/gates";
import NeedsDatabase from "../_components/NeedsDatabase";

export const metadata: Metadata = {
  title: "إدارة المستخدمين",
  robots: { index: false, follow: false },
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "users:manage")) return <Forbidden role={access.role} />;

  const { q } = await searchParams;
  const all = await listUsers();

  return (
    <div>
      <h1 className="text-2xl font-bold">المستخدمون والدعم</h1>
      <p className="mt-1 text-sm text-muted">
        دليل حسابات الطلاب وأعضاء الفريق.
      </p>

      {all === null ? (
        <div className="mt-6">
          <NeedsDatabase />
        </div>
      ) : (
        <UsersDirectory rows={all} query={q ?? ""} />
      )}
    </div>
  );
}

function UsersDirectory({
  rows,
  query,
}: {
  rows: AdminUserRow[];
  query: string;
}) {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (u) =>
          (u.name ?? "").toLowerCase().includes(q) ||
          (u.email ?? "").toLowerCase().includes(q)
      )
    : rows;

  // Counts per role for the stat cards.
  const counts = ROLES.reduce(
    (acc, r) => ({ ...acc, [r]: rows.filter((u) => u.role === r).length }),
    {} as Record<Role, number>
  );
  const team = rows.filter((u) => u.role !== "student").length;

  return (
    <>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="إجمالي المستخدمين" value={rows.length} />
        <Stat label="طلاب" value={counts.student} />
        <Stat label="أعضاء الفريق" value={team} />
        <Stat label="مالكون" value={counts.owner} />
      </div>

      <form action="/admin/users" className="mt-6 flex max-w-sm gap-2">
        <input
          name="q"
          defaultValue={query}
          placeholder="ابحث بالاسم أو البريد..."
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-purple"
        />
        <button className="rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
          بحث
        </button>
      </form>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">الاسم</th>
              <th className="px-4 py-3 text-start font-semibold">البريد</th>
              <th className="px-4 py-3 text-center font-semibold">الدور</th>
              <th className="px-4 py-3 text-center font-semibold">انضمّ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-3 font-medium">{u.name ?? "—"}</td>
                <td className="px-4 py-3 font-mono text-xs">{u.email ?? "—"}</td>
                <td className="px-4 py-3 text-center">
                  <span className="rounded-full bg-brand-purple/15 px-2 py-0.5 text-xs font-bold text-brand-purple">
                    {ROLE_LABELS[u.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-center font-mono text-xs text-muted">
                  {u.createdAt.toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  {rows.length === 0 ? "لا يوجد مستخدمون بعد." : "لا نتائج للبحث."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted">
        تعديل الأدوار من قسم{" "}
        <span className="font-semibold">الإعدادات → الأدوار</span>. تتبّع تقدّم
        الطلاب يحتاج نقل بيانات التقدّم من المتصفّح إلى قاعدة البيانات (مرحلة
        قادمة).
      </p>
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

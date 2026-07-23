import type { Metadata } from "next";
import { listUsers, listAuditLogs } from "@/lib/admin-users";
import { requireAdminCapability } from "@/lib/admin-access";
import {
  can,
  capabilitiesFor,
  ROLE_LABELS,
  ROLES,
  type Capability,
} from "@/lib/rbac";
import NeedsDatabase from "../_components/NeedsDatabase";
import { updateUserRole } from "./actions";

export const metadata: Metadata = {
  title: "الإعدادات والصلاحيات",
  robots: { index: false, follow: false },
};

const CAP_LABELS: Record<Capability, string> = {
  "admin:view": "دخول اللوحة",
  "content:edit": "المحتوى",
  "users:manage": "المستخدمون",
  "billing:manage": "الاشتراكات",
  "jobs:moderate": "الوظائف",
  "seo:manage": "SEO",
  "ops:manage": "العمليات",
  "reports:submit": "تقديم تقارير",
  "reports:review": "مراجعة التقارير",
  "creators:review": "مراجعة المبدعين",
  "settings:manage": "الإعدادات",
};

export default async function AdminSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const { role } = await requireAdminCapability("settings:manage");

  const { saved, error } = await searchParams;
  const users = await listUsers();
  const logs = await listAuditLogs(20);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">الإعدادات والصلاحيات</h1>
        <p className="mt-1 text-sm text-muted">
          إدارة أدوار الفريق، والمظهر، وسجلّ النشاط.
        </p>
      </div>

      {saved && (
        <p className="rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-500">
          ✓ تم تحديث الدور.
        </p>
      )}
      {error === "self" && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          ✗ لا يمكنك خفض دور حسابك (لتفادي فقدان الوصول).
        </p>
      )}

      {/* ── Team roles (RBAC) ── */}
      <section>
        <h2 className="mb-1 text-lg font-bold">أدوار الفريق (RBAC)</h2>
        <p className="mb-3 text-sm text-muted">
          عيّن دورًا لكل عضو. كل دور يفتح أقسامًا محددة من اللوحة.
        </p>
        {users === null ? (
          <NeedsDatabase />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">المستخدم</th>
                  <th className="px-4 py-3 text-start font-semibold">الدور</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium">{u.name ?? "—"}</div>
                      <div className="font-mono text-xs text-muted">
                        {u.email ?? u.id}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <form action={updateUserRole} className="flex gap-2">
                        <input type="hidden" name="userId" value={u.id} />
                        <select
                          name="role"
                          defaultValue={u.role}
                          className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm outline-none focus:border-brand-purple"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                        <button className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-surface">
                          حفظ
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-6 text-center text-muted">
                      لا يوجد مستخدمون بعد.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Capabilities reference ── */}
      <section>
        <h2 className="mb-3 text-lg font-bold">مرجع الصلاحيات</h2>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-3 py-2 text-start font-semibold">الدور</th>
                {(Object.keys(CAP_LABELS) as Capability[]).map((c) => (
                  <th key={c} className="px-3 py-2 text-center font-semibold">
                    {CAP_LABELS[c]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROLES.map((r) => {
                const caps = capabilitiesFor(r);
                return (
                  <tr key={r} className="border-t border-border">
                    <td className="px-3 py-2 font-semibold">{ROLE_LABELS[r]}</td>
                    {(Object.keys(CAP_LABELS) as Capability[]).map((c) => (
                      <td key={c} className="px-3 py-2 text-center">
                        {caps.includes(c) ? (
                          <span className="text-green-500">✓</span>
                        ) : (
                          <span className="text-muted/40">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Appearance ── */}
      <section>
        <h2 className="mb-3 text-lg font-bold">المظهر</h2>
        <div className="rounded-xl border border-border bg-surface/50 p-4">
          <p className="text-sm text-muted">
            الوضع (داكن/فاتح) يتحكّم به كل زائر عبر مفتاح التبديل في الترويسة
            (محفوظ في المتصفّح). ألوان الهوية الأساسية:
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Swatch name="بنفسجي نيون" hex="#B026FF" />
            <Swatch name="سماوي" hex="#00F5FF" />
          </div>
          <p className="mt-3 text-xs text-muted">
            تُضبط القيم الافتراضية في <code className="font-mono">globals.css</code>.
          </p>
        </div>
      </section>

      {/* ── System logs ── */}
      <section>
        <h2 className="mb-3 text-lg font-bold">سجلّ النشاط</h2>
        {logs === null ? (
          <NeedsDatabase compact />
        ) : logs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted">
            لا يوجد نشاط مُسجَّل بعد.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="px-4 py-2 text-start font-semibold">الإجراء</th>
                  <th className="px-4 py-2 text-start font-semibold">المنفّذ</th>
                  <th className="px-4 py-2 text-start font-semibold">الهدف</th>
                  <th className="px-4 py-2 text-center font-semibold">الوقت</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-4 py-2 font-mono text-xs">{l.action}</td>
                    <td className="px-4 py-2 text-xs">
                      {l.actorName ?? l.actorEmail ?? "—"}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-muted">
                      {l.target ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-center font-mono text-xs text-muted">
                      {l.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Swatch({ name, hex }: { name: string; hex: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
      <span
        className="h-6 w-6 rounded"
        style={{ backgroundColor: hex }}
        aria-hidden
      />
      <span className="text-sm">{name}</span>
      <span className="font-mono text-xs text-muted">{hex}</span>
    </div>
  );
}

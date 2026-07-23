import type { Metadata } from "next";
import {
  listSubscriptions,
  listOrganizations,
  type SubscriptionRow,
  type OrganizationRow,
} from "@/lib/admin-billing";
import { isPaymentsEnabled } from "@/lib/flags";
import { requireAdminCapability } from "@/lib/admin-access";
import NeedsDatabase from "../_components/NeedsDatabase";

export const metadata: Metadata = {
  title: "الاشتراكات والشركات",
  robots: { index: false, follow: false },
};

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  trialing: "تجريبي",
  past_due: "متأخّر",
  canceled: "ملغى",
  incomplete: "غير مكتمل",
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-500/15 text-green-500",
  trialing: "bg-brand-cyan/15 text-brand-cyan",
  past_due: "bg-amber-500/15 text-amber-500",
  canceled: "bg-zinc-500/15 text-muted",
  incomplete: "bg-amber-500/15 text-amber-500",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-bold ${
        STATUS_STYLES[status] ?? "bg-zinc-500/15 text-muted"
      }`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default async function AdminBillingPage() {
  await requireAdminCapability("billing:manage");

  const subs = await listSubscriptions();
  const orgs = await listOrganizations();

  return (
    <div>
      <h1 className="text-2xl font-bold">الاشتراكات والشركات</h1>
      <p className="mt-1 text-sm text-muted">
        مشتركو Premium Pro وتراخيص الشركات (B2B).
      </p>

      {subs === null || orgs === null ? (
        <div className="mt-6">
          <NeedsDatabase />
        </div>
      ) : (
        <BillingDashboard subs={subs} orgs={orgs} />
      )}
    </div>
  );
}

function BillingDashboard({
  subs,
  orgs,
}: {
  subs: SubscriptionRow[];
  orgs: OrganizationRow[];
}) {
  const activePro = subs.filter((s) => s.status === "active").length;
  const seatsTotal = orgs.reduce((n, o) => n + o.seatsTotal, 0);
  const seatsUsed = orgs.reduce((n, o) => n + o.seatsUsed, 0);

  return (
    <>
      {!isPaymentsEnabled() && (
        <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
          ⚠️ Stripe غير مفعّل. لن تظهر اشتراكات حقيقية حتى تُضبط
          <code className="mx-1 font-mono">STRIPE_SECRET_KEY</code>
          ويُربط الـ webhook لتعبئة هذه الجداول.
        </p>
      )}

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="مشتركو Pro النشطون" value={activePro} />
        <Stat label="إجمالي الاشتراكات" value={subs.length} />
        <Stat label="عملاء الشركات" value={orgs.length} />
        <Stat label="المقاعد المستخدمة" value={`${seatsUsed}/${seatsTotal}`} />
      </div>

      {/* Premium Pro subscriptions */}
      <h2 className="mb-3 mt-8 text-lg font-bold">اشتراكات Premium Pro</h2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">المشترك</th>
              <th className="px-4 py-3 text-center font-semibold">الخطة</th>
              <th className="px-4 py-3 text-center font-semibold">الحالة</th>
              <th className="px-4 py-3 text-center font-semibold">يتجدّد</th>
            </tr>
          </thead>
          <tbody>
            {subs.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium">{s.userName ?? "—"}</div>
                  <div className="font-mono text-xs text-muted">
                    {s.userEmail ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3 text-center uppercase">{s.plan}</td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={s.status} />
                </td>
                <td className="px-4 py-3 text-center font-mono text-xs text-muted">
                  {s.currentPeriodEnd
                    ? s.currentPeriodEnd.toISOString().slice(0, 10)
                    : "—"}
                </td>
              </tr>
            ))}
            {subs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  لا توجد اشتراكات بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Corporate clients */}
      <h2 className="mb-3 mt-8 text-lg font-bold">عملاء الشركات (B2B)</h2>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">الشركة</th>
              <th className="px-4 py-3 text-center font-semibold">المقاعد</th>
              <th className="px-4 py-3 text-center font-semibold">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="px-4 py-3">
                  <div className="font-medium">{o.name}</div>
                  <div className="font-mono text-xs text-muted">
                    {o.billingEmail ?? "—"}
                  </div>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="font-mono">
                    {o.seatsUsed}/{o.seatsTotal}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={o.status} />
                </td>
              </tr>
            ))}
            {orgs.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-6 text-center text-muted">
                  لا يوجد عملاء شركات بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-xl border border-dashed border-border p-4 text-sm text-muted">
        <p className="font-semibold text-foreground">خطوات التفعيل والمراحل القادمة:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>
            اضبط مفاتيح Stripe واربط الـ webhook ليكتب صفوف الاشتراكات هنا تلقائيًا.
          </li>
          <li>إدارة المقاعد (دعوة موظفين، إلغاء) وإصدار الفواتير للشركات.</li>
          <li>بوابة دفع محلية (Moyasar/Paymob) لمنطقة الشرق الأوسط.</li>
        </ul>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 text-center">
      <div className="text-2xl font-extrabold text-brand-purple">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}

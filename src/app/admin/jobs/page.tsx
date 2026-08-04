import type { Metadata } from "next";
import Link from "next/link";
import { getJobs } from "@/lib/jobs";
import { isContentWritable } from "@/lib/admin-content";
import { getJobAlerts } from "@/lib/admin-jobs";
import { COUNTRIES } from "@/lib/job-search";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { Forbidden } from "../_components/gates";

export const metadata: Metadata = {
  title: "إدارة الوظائف",
  robots: { index: false, follow: false },
};

export default async function AdminJobsPage() {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "jobs:moderate")) return <Forbidden role={access.role} />;

  const jobs = getJobs();
  const writable = isContentWritable();
  const alerts = await getJobAlerts();
  const countryName = (slug: string) =>
    COUNTRIES.find((c) => c.slug === slug)?.nameAr ?? slug;

  return (
    <div>
      <h1 className="text-2xl font-bold">لوحة الوظائف</h1>
      <p className="mt-1 text-sm text-muted">
        كل إعلانات الوظائف المنشورة ({jobs.length}). راجِع وعدّل التفاصيل.
      </p>

      {!writable && (
        <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
          ⚠️ التحرير معطّل في الإنتاج (نظام ملفات للقراءة فقط). يعمل محليًا عبر{" "}
          <code className="font-mono">npm run dev</code>.
        </p>
      )}

      {/* Jobs table */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">الوظيفة</th>
              <th className="px-4 py-3 text-start font-semibold">الشركة</th>
              <th className="px-4 py-3 text-center font-semibold">النوع</th>
              <th className="px-4 py-3 text-center font-semibold">عن بُعد</th>
              <th className="px-4 py-3 text-center font-semibold">النشر</th>
              <th className="px-4 py-3 text-center font-semibold">إجراء</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.slug} className="border-t border-border">
                <td className="px-4 py-3">
                  <span className="font-semibold">{j.title}</span>
                  <span className="ms-2 font-mono text-xs text-muted">
                    {j.slug}
                  </span>
                </td>
                <td className="px-4 py-3">{j.company}</td>
                <td className="px-4 py-3 text-center">{j.type}</td>
                <td className="px-4 py-3 text-center">
                  {j.remote ? (
                    <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs font-bold text-green-500">
                      نعم
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center font-mono text-xs text-muted">
                  {j.postedDate}
                </td>
                <td className="px-4 py-3 text-center">
                  <Link
                    href={`/admin/jobs/${j.slug}`}
                    className="rounded-lg border border-border px-3 py-1 text-xs font-semibold transition hover:bg-surface"
                  >
                    {writable ? "تحرير" : "عرض"}
                  </Link>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  لا توجد وظائف.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Job alert signups — lead list for real employer outreach */}
      <h2 className="mt-8 text-xl font-bold">
        تنبيهات الوظائف ({alerts.length})
      </h2>
      <p className="mt-1 text-sm text-muted">
        زوار سجّلوا إيميلهم بانتظار وظائف حقيقية. استخدم هاي القائمة لما
        تتواصل مع شركة — &ldquo;عندنا N مطوّر بانتظار وظائف {`{تخصص}`}
        بمصر&rdquo; ورقة ضغط حقيقية بالتفاوض.
      </p>
      <div className="mt-4 max-h-96 overflow-x-auto overflow-y-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface text-muted">
            <tr>
              <th className="px-4 py-3 text-start font-semibold">الإيميل</th>
              <th className="px-4 py-3 text-center font-semibold">الدولة</th>
              <th className="px-4 py-3 text-center font-semibold">التخصص</th>
              <th className="px-4 py-3 text-center font-semibold">التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                  {a.email}
                </td>
                <td className="px-4 py-3 text-center">
                  {countryName(a.country)}
                </td>
                <td className="px-4 py-3 text-center text-muted">
                  {a.specialty ?? "—"}
                </td>
                <td className="px-4 py-3 text-center font-mono text-xs text-muted">
                  {a.createdAt.toISOString().slice(0, 10)}
                </td>
              </tr>
            ))}
            {alerts.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  ما في تسجيلات بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Honest scope note */}
      <div className="mt-6 rounded-xl border border-dashed border-border p-4 text-sm text-muted">
        <p className="font-semibold text-foreground">قيد الإنشاء (يتطلب قاعدة بيانات):</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>مراجعة حسابات الشركات والموافقة عليها.</li>
          <li>قائمة انتظار للإعلانات الجديدة قبل النشر.</li>
          <li>باقات التوظيف (تثبيت الإعلان، المدة، التسعير).</li>
        </ul>
        <p className="mt-2 text-xs">
          هذه تحتاج حسابات شركات وجداول قاعدة بيانات (مرحلة B2B القادمة).
        </p>
      </div>
    </div>
  );
}

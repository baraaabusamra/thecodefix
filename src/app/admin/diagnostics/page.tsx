import type { Metadata } from "next";
import Link from "next/link";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { Forbidden } from "../_components/gates";
import { runDiagnostics } from "@/lib/admin-diagnostics";
import ExportButton from "@/components/ExportButton";

export const metadata: Metadata = {
  title: "تشخيص المحتوى",
  robots: { index: false, follow: false },
};

export default async function DiagnosticsPage() {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "content:edit"))
    return <Forbidden role={access.role} />;

  const report = await runDiagnostics();

  // Rows for CSV export (flat inventory).
  const exportRows = report.tracks.map((t) => ({
    track: t.slug,
    title: t.title,
    lessons: t.lessonCount,
    quiz_questions: t.quizCount,
    missing_description: t.missingDescription,
    missing_keywords: t.missingKeywords,
    duplicate_orders: t.duplicateOrders.join(" "),
    issues: t.issues.length,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">🩺 تشخيص المحتوى</h1>
          <p className="mt-1 text-sm text-muted">
            فحص جودة كل المسارات: اكتمال الدروس والاختبارات والبيانات الوصفية.
          </p>
        </div>
        <ExportButton rows={exportRows} filename="content-inventory.csv" label="تصدير الجرد CSV" />
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="مسار" value={report.tracks.length} />
        <Stat label="مسار سليم" value={report.healthyTracks} good />
        <Stat
          label="مسار به ملاحظات"
          value={report.tracks.length - report.healthyTracks}
          warn={report.tracks.length - report.healthyTracks > 0}
        />
        <Stat label="إجمالي الملاحظات" value={report.totalIssues} warn={report.totalIssues > 0} />
      </div>

      {/* Per-track */}
      <div className="space-y-2">
        {report.tracks.map((t) => (
          <div
            key={t.slug}
            className={`rounded-xl border bg-surface p-4 ${
              t.issues.length === 0 ? "border-border" : "border-amber-500/40"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 font-semibold">
                <span>{t.icon}</span>
                {t.title}
                <span className="font-mono text-xs text-muted">{t.slug}</span>
              </span>
              <span className="flex items-center gap-2 text-xs">
                <span className="text-muted">{t.lessonCount} درس · {t.quizCount} سؤال</span>
                {t.issues.length === 0 ? (
                  <span className="rounded-full bg-green-500/15 px-2 py-0.5 font-bold text-green-500">
                    ✓ سليم
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-bold text-amber-500">
                    {t.issues.length} ملاحظة
                  </span>
                )}
                <Link
                  href={`/learn/${t.slug}`}
                  className="rounded-lg border border-border px-2 py-0.5 font-semibold text-brand-cyan hover:underline"
                >
                  فتح
                </Link>
              </span>
            </div>
            {t.issues.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {t.issues.map((iss, i) => (
                  <li
                    key={i}
                    className="rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-600 dark:text-amber-400"
                  >
                    {iss}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  good,
  warn,
}: {
  label: string;
  value: number;
  good?: boolean;
  warn?: boolean;
}) {
  const color = good
    ? "text-green-500"
    : warn
      ? "text-amber-500"
      : "text-brand-purple";
  return (
    <div className="rounded-xl border border-border bg-surface p-4 text-center">
      <div className={`text-3xl font-extrabold ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}

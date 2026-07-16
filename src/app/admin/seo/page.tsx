import type { Metadata } from "next";
import { listKeywords } from "@/lib/admin-seo";
import type { SeoKeyword } from "@/db/schema";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { Forbidden } from "../_components/gates";
import NeedsDatabase from "../_components/NeedsDatabase";
import { addKeyword, updateKeyword, deleteKeyword } from "./actions";

export const metadata: Metadata = {
  title: "أدوات SEO",
  robots: { index: false, follow: false },
};

export default async function AdminSeoPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; deleted?: string; error?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "seo:manage")) return <Forbidden role={access.role} />;

  const { saved, deleted, error } = await searchParams;
  const keywords = await listKeywords();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">أدوات SEO والأداء</h1>
        <p className="mt-1 text-sm text-muted">
          تتبّع الكلمات المفتاحية، البيانات المنظَّمة، ومؤشّرات الأداء.
        </p>
      </div>

      {saved && <Banner tone="success">✓ تم الحفظ.</Banner>}
      {deleted && <Banner tone="success">✓ تم الحذف.</Banner>}
      {error === "keyword" && <Banner tone="error">✗ أدخل كلمة مفتاحية.</Banner>}

      {/* ── Keyword tracker ── */}
      <section>
        <h2 className="mb-1 text-lg font-bold">متتبّع الكلمات المفتاحية</h2>
        <p className="mb-3 text-xs text-muted">
          اربط الكلمات بالصفحات المستهدفة وسجّل ترتيبها. الجلب التلقائي للترتيب من
          جوجل يحتاج Search Console API (لاحقًا) — تُدخل المراتب يدويًا الآن.
        </p>
        {keywords === null ? (
          <NeedsDatabase />
        ) : (
          <KeywordTracker rows={keywords} />
        )}
      </section>

      {/* ── Structured data audit ── */}
      <section>
        <h2 className="mb-1 text-lg font-bold">البيانات المنظَّمة (Schema)</h2>
        <p className="mb-3 text-xs text-muted">
          ما تُصدره صفحاتك حاليًا من JSON-LD. تحقّق منها عبر{" "}
          <a
            href="https://search.google.com/test/rich-results"
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-cyan hover:underline"
          >
            اختبار النتائج الغنية
          </a>
          .
        </p>
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-2 text-start font-semibold">نوع الصفحة</th>
                <th className="px-4 py-2 text-start font-semibold">Schema</th>
              </tr>
            </thead>
            <tbody>
              {SCHEMA_AUDIT.map((s) => (
                <tr key={s.page} className="border-t border-border">
                  <td className="px-4 py-2 font-medium">{s.page}</td>
                  <td className="px-4 py-2 font-mono text-xs" dir="ltr">
                    {s.schema}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Core Web Vitals ── */}
      <section>
        <h2 className="mb-1 text-lg font-bold">مؤشّرات Core Web Vitals</h2>
        <p className="mb-3 text-xs text-muted">
          عتبات الأداء الجيّد. لقياس بيانات الميدان الحيّة فعّل Vercel Speed
          Insights أو استخدم CrUX API.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {VITALS.map((v) => (
            <div key={v.metric} className="rounded-xl border border-border bg-surface p-4">
              <div className="flex items-baseline justify-between">
                <span className="font-bold" dir="ltr">
                  {v.metric}
                </span>
                <span className="text-xs text-green-500">≤ {v.good}</span>
              </div>
              <p className="mt-1 text-xs text-muted">{v.label}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <PsiLink path="/" label="الرئيسية" />
          <PsiLink path="/learn/javascript/00-intro" label="درس" />
          <PsiLink path="/blog" label="المدوّنة" />
        </div>
      </section>
    </div>
  );
}

function KeywordTracker({ rows }: { rows: SeoKeyword[] }) {
  const top10 = rows.filter((r) => r.position != null && r.position <= 10).length;
  const untracked = rows.filter((r) => r.position == null).length;

  return (
    <>
      <div className="mb-3 grid grid-cols-3 gap-3">
        <Stat label="كلمات" value={rows.length} />
        <Stat label="ضمن أول 10" value={top10} />
        <Stat label="بلا ترتيب" value={untracked} />
      </div>

      {/* Add */}
      <form
        action={addKeyword}
        className="mb-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface/50 p-3"
      >
        <input
          name="keyword"
          placeholder="الكلمة المفتاحية (مثل: شرح جافاسكريبت بالعربي)"
          className="min-w-48 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-purple"
        />
        <input
          name="targetPath"
          dir="ltr"
          placeholder="/learn/javascript/00-intro"
          className="min-w-48 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-end font-mono text-xs outline-none focus:border-brand-purple"
        />
        <button className="rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
          إضافة
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-3 py-2 text-start font-semibold">الكلمة</th>
              <th className="px-3 py-2 text-start font-semibold">الصفحة</th>
              <th className="px-3 py-2 text-center font-semibold">الترتيب / ملاحظات</th>
              <th className="px-3 py-2 text-center font-semibold">حذف</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((k) => (
              <tr key={k.id} className="border-t border-border align-top">
                <td className="px-3 py-2 font-medium">{k.keyword}</td>
                <td className="px-3 py-2">
                  {k.targetPath ? (
                    <a
                      href={k.targetPath}
                      target="_blank"
                      rel="noopener noreferrer"
                      dir="ltr"
                      className="font-mono text-xs text-brand-cyan hover:underline"
                    >
                      {k.targetPath}
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <form action={updateKeyword} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={k.id} />
                    <input
                      name="position"
                      type="number"
                      min={1}
                      defaultValue={k.position ?? ""}
                      placeholder="#"
                      className="w-16 rounded-lg border border-border bg-background px-2 py-1 text-center text-sm outline-none focus:border-brand-purple"
                    />
                    <input
                      name="notes"
                      defaultValue={k.notes ?? ""}
                      placeholder="ملاحظات"
                      className="min-w-32 flex-1 rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:border-brand-purple"
                    />
                    <button className="rounded-lg border border-border px-3 py-1 text-xs font-semibold transition hover:bg-surface">
                      حفظ
                    </button>
                  </form>
                </td>
                <td className="px-3 py-2 text-center">
                  <form action={deleteKeyword}>
                    <input type="hidden" name="id" value={k.id} />
                    <button className="rounded-lg px-2 py-1 text-xs text-red-500 transition hover:bg-red-500/10">
                      🗑️
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-muted">
                  لا توجد كلمات مفتاحية بعد. أضِف أوّل كلمة أعلاه.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

const SCHEMA_AUDIT = [
  { page: "كل الصفحات", schema: "Organization, WebSite (SearchAction)" },
  { page: "صفحة المسار", schema: "Course" },
  { page: "صفحة الدرس", schema: "LearningResource, BreadcrumbList" },
  { page: "مقال المدوّنة", schema: "BlogPosting" },
  { page: "إعلان الوظيفة", schema: "JobPosting" },
];

const VITALS = [
  { metric: "LCP", good: "2.5s", label: "أكبر عنصر مرئي" },
  { metric: "INP", good: "200ms", label: "سرعة الاستجابة للتفاعل" },
  { metric: "CLS", good: "0.1", label: "ثبات التخطيط البصري" },
];

function PsiLink({ path, label }: { path: string; label: string }) {
  const url = `https://pagespeed.web.dev/analysis?url=https://thecodefix.vercel.app${path}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold transition hover:bg-surface"
    >
      فحص PageSpeed: {label} ↗
    </a>
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

function Banner({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: React.ReactNode;
}) {
  const styles =
    tone === "success"
      ? "border-green-500/40 bg-green-500/10 text-green-500"
      : "border-red-500/40 bg-red-500/10 text-red-500";
  return (
    <p className={`rounded-lg border px-3 py-2 text-sm ${styles}`}>{children}</p>
  );
}

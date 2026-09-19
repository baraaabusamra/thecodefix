import type { Metadata } from "next";
import Link from "next/link";
import { getTracks, getLessons } from "@/lib/content";
import { hasQuiz, getQuiz } from "@/lib/quiz";
import { getPosts } from "@/lib/blog";
import { getJobs } from "@/lib/jobs";
import { isAuthEnabled, isPaymentsEnabled } from "@/lib/flags";
import { resolveAdmin } from "@/lib/admin-access";
import { listAuditLogs } from "@/lib/admin-users";
import TableFilter from "@/components/TableFilter";
import { can, capabilitiesFor, ROLE_LABELS, type Capability, type Role } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "لوحة الإدارة",
  description: "نظرة عامة على محتوى The Code Fix.",
  robots: { index: false, follow: false },
};

// Admin overview dashboard. Access is gated by the admin layout; here we just
// read the resolved role to tailor the view. Content lives in files and
// production runs on a read-only filesystem, so this surfaces an overview.
export default async function AdminPage() {
  const access = await resolveAdmin();
  if (!access.ok) return null; // layout already rendered the gate
  const role = access.role;

  const tracks = await getTracks();
  const trackRows = await Promise.all(
    tracks.map(async (t) => {
      const lessons = await getLessons(t.slug);
      const quiz = hasQuiz(t.slug) ? getQuiz(t.slug) : null;
      return {
        ...t,
        lessonCount: lessons.length,
        quizCount: quiz?.questions.length ?? 0,
      };
    })
  );

  const posts = getPosts();
  const jobs = getJobs();
  const totalLessons = trackRows.reduce((n, t) => n + t.lessonCount, 0);
  const totalQuestions = trackRows.reduce((n, t) => n + t.quizCount, 0);

  // Content-health: a track is "complete" at 20+ lessons and a 15+ question quiz.
  const completeTracks = trackRows.filter(
    (t) => t.lessonCount >= 20 && t.quizCount >= 15
  ).length;
  const healthPct = tracks.length
    ? Math.round((completeTracks / tracks.length) * 100)
    : 0;
  const maxLessons = Math.max(1, ...trackRows.map((t) => t.lessonCount));
  const chartRows = [...trackRows].sort((a, b) => b.lessonCount - a.lessonCount);

  // Recent activity (null when DB is not configured).
  const activity = can(role, "settings:manage") ? await listAuditLogs(8) : null;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">لوحة الإدارة</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <span>
              {access.mode === "rbac" && access.name
                ? `مرحبًا، ${access.name}`
                : "نظرة عامة على محتوى الموقع"}
            </span>
            <span className="rounded-full bg-brand-purple/15 px-2 py-0.5 text-xs font-bold text-brand-purple">
              {ROLE_LABELS[role]}
            </span>
          </p>
        </div>
        {access.mode === "token" && !process.env.ADMIN_TOKEN && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            ⚠️ وضع المفتاح المشترك. فعّل قاعدة البيانات وتسجيل الدخول للوصول
            المبني على الأدوار (RBAC).
          </p>
        )}
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="مسار" value={tracks.length} />
        <Stat label="درس" value={totalLessons} />
        <Stat label="سؤال اختبار" value={totalQuestions} />
        <Stat label="مسار مكتمل" value={completeTracks} />
        <Stat label="مقال" value={posts.length} />
        <Stat label="وظيفة" value={jobs.length} />
      </div>

      {/* Content analytics */}
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-3 text-xl font-bold">📊 الدروس لكل مسار</h2>
          <div className="max-h-80 space-y-1.5 overflow-y-auto rounded-xl border border-border bg-surface p-4">
            {chartRows.map((t) => (
              <div key={t.slug} className="flex items-center gap-2 text-sm">
                <span className="w-28 shrink-0 truncate" title={t.title}>
                  {t.icon} {t.title}
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-background">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-brand-purple to-brand-cyan"
                    style={{ width: `${(t.lessonCount / maxLessons) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-end font-mono text-xs text-muted">
                  {t.lessonCount}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xl font-bold">🩺 اكتمال المحتوى</h2>
          <div className="rounded-xl border border-border bg-surface p-6 text-center">
            <div
              className="mx-auto grid h-32 w-32 place-items-center rounded-full"
              style={{
                background: `conic-gradient(var(--brand-purple) ${healthPct * 3.6}deg, var(--border) 0deg)`,
              }}
            >
              <div className="grid h-24 w-24 place-items-center rounded-full bg-surface">
                <span className="text-2xl font-extrabold neon-text">
                  {healthPct}%
                </span>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted">
              {completeTracks} من {tracks.length} مسار مكتمل
              <br />
              (٢٠+ درسًا و١٥+ سؤالًا)
            </p>
          </div>
        </section>
      </div>

      {/* Recent activity */}
      <h2 className="mb-3 mt-10 text-xl font-bold">🕓 آخر النشاط</h2>
      {activity === null ? (
        <p className="rounded-xl border border-dashed border-border bg-surface/40 px-4 py-6 text-center text-sm text-muted">
          سجلّ النشاط يظهر هنا عند تفعيل قاعدة البيانات وتسجيل العمليات الإدارية.
        </p>
      ) : activity.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
          لا يوجد نشاط مُسجَّل بعد.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {activity.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                <span className="font-semibold">{a.actorName ?? a.actorEmail ?? "النظام"}</span>
                <span className="text-muted"> — {a.action}</span>
                {a.target && <span className="font-mono text-xs text-muted"> ({a.target})</span>}
              </span>
              <span className="shrink-0 font-mono text-xs text-muted">
                {new Date(a.createdAt).toLocaleDateString("ar")}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Feature flags */}
      <h2 className="mb-3 mt-10 text-xl font-bold">حالة الميزات</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <FlagRow
          label="تسجيل الدخول (Auth)"
          enabled={isAuthEnabled()}
          hint="يتفعّل عند ضبط AUTH_SECRET ومزوّد GitHub/Google."
        />
        <FlagRow
          label="المدفوعات (Stripe)"
          enabled={isPaymentsEnabled()}
          hint="يتفعّل عند ضبط STRIPE_SECRET_KEY و STRIPE_PRO_PRICE_ID، وبعد تفعيل ميزة Pro واحدة على الأقل في الكود (ENFORCED_PRO_FEATURES)."
        />
      </div>

      {/* RBAC section access for the current role */}
      <h2 className="mb-1 mt-10 text-xl font-bold">أقسام لوحة الإدارة</h2>
      <p className="mb-3 text-sm text-muted">
        الصلاحيات المتاحة لدورك ({ROLE_LABELS[role]}). الأقسام المؤمَّنة تُبنى في
        المراحل القادمة.
      </p>
      <SectionMatrix role={role} />

      {/* Tracks table */}
      <div className="mb-3 mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">المسارات</h2>
        <TableFilter targetId="tracks-table" placeholder="تصفية المسارات..." />
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table id="tracks-table" className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <Th>المسار</Th>
              <Th className="text-center">الدروس</Th>
              <Th className="text-center">أسئلة الاختبار</Th>
              <Th className="text-center">عرض</Th>
            </tr>
          </thead>
          <tbody>
            {trackRows.map((t) => (
              <tr key={t.slug} className="border-t border-border">
                <td className="px-4 py-3">
                  <span className="me-2">{t.icon}</span>
                  <span className="font-semibold">{t.title}</span>
                  <span className="ms-2 font-mono text-xs text-muted">
                    {t.slug}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">{t.lessonCount}</td>
                <td className="px-4 py-3 text-center">
                  {t.quizCount > 0 ? (
                    t.quizCount
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <Link
                    href={`/learn/${t.slug}`}
                    className="font-semibold text-brand-cyan hover:underline"
                  >
                    فتح
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Blog + jobs */}
      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">أحدث المقالات</h2>
            <Link
              href="/blog"
              className="text-sm font-semibold text-brand-cyan hover:underline"
            >
              عرض الكل →
            </Link>
          </div>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {posts.slice(0, 6).map((p) => (
              <li
                key={p.slug}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <Link
                  href={`/blog/${p.slug}`}
                  className="truncate font-semibold hover:text-brand-cyan"
                >
                  {p.title}
                </Link>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {p.date}
                </span>
              </li>
            ))}
            {posts.length === 0 && <Empty />}
          </ul>
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xl font-bold">أحدث الوظائف</h2>
            <Link
              href="/jobs"
              className="text-sm font-semibold text-brand-cyan hover:underline"
            >
              عرض الكل →
            </Link>
          </div>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {jobs.slice(0, 6).map((j) => (
              <li
                key={j.slug}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <Link
                  href={`/jobs/${j.slug}`}
                  className="truncate font-semibold hover:text-brand-cyan"
                >
                  {j.title}{" "}
                  <span className="font-normal text-muted">— {j.company}</span>
                </Link>
                <span className="shrink-0 font-mono text-xs text-muted">
                  {j.postedDate}
                </span>
              </li>
            ))}
            {jobs.length === 0 && <Empty />}
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 text-center neon-glow">
      <div className="text-3xl font-extrabold text-brand-purple">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}

function FlagRow({
  label,
  enabled,
  hint,
}: {
  label: string;
  enabled: boolean;
  hint: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface p-4">
      <div>
        <div className="font-semibold">{label}</div>
        <div className="mt-1 text-xs text-muted">{hint}</div>
      </div>
      <span
        className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
          enabled
            ? "bg-green-500/15 text-green-500"
            : "bg-zinc-500/15 text-muted"
        }`}
      >
        {enabled ? "مفعّل" : "غير مفعّل"}
      </span>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`px-4 py-3 text-start font-semibold ${className}`}>
      {children}
    </th>
  );
}

function Empty() {
  return <li className="px-4 py-6 text-center text-sm text-muted">لا يوجد</li>;
}

// Admin sections mapped to the capability that unlocks them.
const ADMIN_SECTIONS: { cap: Capability; label: string; desc: string }[] = [
  { cap: "content:edit", label: "المحتوى والتوثيق", desc: "الدروس، الاختبارات، مسارات التعلّم" },
  { cap: "users:manage", label: "المستخدمون والدعم", desc: "حسابات الطلاب وتذاكر الدعم" },
  { cap: "billing:manage", label: "الاشتراكات والشركات", desc: "Premium Pro وتراخيص B2B" },
  { cap: "jobs:moderate", label: "لوحة الوظائف", desc: "مراجعة الشركات والإعلانات" },
  { cap: "seo:manage", label: "أدوات SEO", desc: "الكلمات المفتاحية والبيانات المنظَّمة" },
  { cap: "settings:manage", label: "الإعدادات والصلاحيات", desc: "الأدوار، السجلّات، النسخ الاحتياطي" },
];

function SectionMatrix({ role }: { role: Role }) {
  const total = capabilitiesFor(role).length;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {ADMIN_SECTIONS.map((s) => {
        const allowed = can(role, s.cap);
        return (
          <div
            key={s.cap}
            className={`rounded-xl border p-4 ${
              allowed
                ? "border-border bg-surface"
                : "border-border/50 bg-surface/40 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold">{s.label}</span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
                  allowed
                    ? "bg-green-500/15 text-green-500"
                    : "bg-zinc-500/15 text-muted"
                }`}
              >
                {allowed ? "متاح" : "لا صلاحية"}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">{s.desc}</p>
          </div>
        );
      })}
      <div className="grid place-items-center rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted">
        دورك يمنحك {total} من الصلاحيات
      </div>
    </div>
  );
}

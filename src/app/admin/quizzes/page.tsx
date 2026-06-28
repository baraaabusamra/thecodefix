import type { Metadata } from "next";
import Link from "next/link";
import { getTracks } from "@/lib/content";
import { hasQuiz, getQuiz } from "@/lib/quiz";
import { isContentWritable } from "@/lib/admin-content";
import { listCertificates } from "@/lib/admin-certificates";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { Forbidden } from "../_components/gates";
import NeedsDatabase from "../_components/NeedsDatabase";
import ExportButton from "@/components/ExportButton";

export const metadata: Metadata = {
  title: "الاختبارات والشهادات",
  robots: { index: false, follow: false },
};

export default async function AdminQuizzesPage() {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "content:edit")) return <Forbidden role={access.role} />;

  const tracks = await getTracks();
  const quizzed = tracks.filter((t) => hasQuiz(t.slug));
  const writable = isContentWritable();
  const certs = await listCertificates(50);

  const totalQuestions = quizzed.reduce(
    (n, t) => n + (getQuiz(t.slug)?.questions.length ?? 0),
    0
  );

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">الاختبارات والشهادات</h1>
        <p className="mt-1 text-sm text-muted">
          بنك الأسئلة لكل مسار، والشهادات الصادرة.
        </p>
      </div>

      {/* Quiz bank */}
      <section>
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="اختبارات" value={quizzed.length} />
          <Stat label="إجمالي الأسئلة" value={totalQuestions} />
          <Stat
            label="مسارات بلا اختبار"
            value={tracks.length - quizzed.length}
          />
        </div>

        {!writable && (
          <p className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
            ⚠️ التحرير معطّل في الإنتاج. يعمل محليًا عبر{" "}
            <code className="font-mono">npm run dev</code>.
          </p>
        )}

        <div className="mb-3 flex justify-end">
          <ExportButton
            filename="quiz-bank.csv"
            label="تصدير بنك الأسئلة"
            rows={quizzed.map((t) => ({
              track: t.slug,
              title: t.title,
              questions: getQuiz(t.slug)?.questions.length ?? 0,
            }))}
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface text-muted">
              <tr>
                <th className="px-4 py-3 text-start font-semibold">المسار</th>
                <th className="px-4 py-3 text-center font-semibold">الأسئلة</th>
                <th className="px-4 py-3 text-center font-semibold">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {quizzed.map((t) => (
                <tr key={t.slug} className="border-t border-border">
                  <td className="px-4 py-3">
                    <span className="me-2">{t.icon}</span>
                    <span className="font-semibold">{t.title}</span>
                    <span className="ms-2 font-mono text-xs text-muted">
                      {t.slug}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {getQuiz(t.slug)?.questions.length ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Link
                      href={`/admin/quizzes/${t.slug}`}
                      className="rounded-lg border border-border px-3 py-1 text-xs font-semibold transition hover:bg-surface"
                    >
                      {writable ? "تحرير" : "عرض"}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Certificates */}
      <section>
        <h2 className="mb-3 text-lg font-bold">الشهادات الصادرة</h2>
        {certs === null ? (
          <NeedsDatabase compact />
        ) : certs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted">
            لا توجد شهادات بعد. تُسجَّل الشهادة عند اجتياز مستخدم مسجَّل لاختبار.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-surface text-muted">
                <tr>
                  <th className="px-4 py-3 text-start font-semibold">الاسم</th>
                  <th className="px-4 py-3 text-start font-semibold">المسار</th>
                  <th className="px-4 py-3 text-center font-semibold">النتيجة</th>
                  <th className="px-4 py-3 text-start font-semibold">الرقم</th>
                  <th className="px-4 py-3 text-center font-semibold">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {certs.map((c) => (
                  <tr key={c.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{c.recipientName}</td>
                    <td className="px-4 py-3">{c.trackTitle}</td>
                    <td className="px-4 py-3 text-center">
                      {c.score}/{c.total}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs" dir="ltr">
                      {c.certId}
                    </td>
                    <td className="px-4 py-3 text-center font-mono text-xs text-muted">
                      {c.issuedAt.toISOString().slice(0, 10)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          أداة التحقّق العامة:{" "}
          <Link href="/verify" className="text-brand-cyan hover:underline">
            /verify
          </Link>
        </p>
      </section>
    </div>
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

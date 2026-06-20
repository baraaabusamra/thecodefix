import type { Metadata } from "next";
import Link from "next/link";
import { getTracks, getLessons } from "@/lib/content";
import { hasQuiz, getQuiz } from "@/lib/quiz";
import { getPosts } from "@/lib/blog";
import { isContentWritable } from "@/lib/admin-content";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { Forbidden } from "../_components/gates";

export const metadata: Metadata = {
  title: "إدارة المحتوى",
  robots: { index: false, follow: false },
};

export default async function ContentPage() {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "content:edit")) return <Forbidden role={access.role} />;

  const tracks = getTracks();
  const posts = getPosts();
  const writable = isContentWritable();

  return (
    <div>
      <h1 className="text-2xl font-bold">المحتوى والتوثيق</h1>
      <p className="mt-1 text-sm text-muted">
        كل الدروس والاختبارات والمقالات. حرّر دروس MDX مباشرة من هنا.
      </p>

      {!writable && (
        <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
          ⚠️ التحرير معطّل في بيئة الإنتاج (نظام ملفات للقراءة فقط). يعمل التحرير
          محليًا عبر <code className="font-mono">npm run dev</code>. للتحرير في
          الإنتاج يلزم نقل المحتوى إلى قاعدة بيانات أو ربط بـ Git.
        </p>
      )}

      {/* Tracks → lessons */}
      <h2 className="mb-3 mt-8 text-lg font-bold">
        المسارات والدروس{" "}
        <span className="text-sm font-normal text-muted">
          ({tracks.length} مسار)
        </span>
      </h2>
      <div className="space-y-3">
        {tracks.map((t) => {
          const lessons = getLessons(t.slug);
          const quiz = hasQuiz(t.slug) ? getQuiz(t.slug) : null;
          return (
            <details
              key={t.slug}
              className="rounded-xl border border-border bg-surface/50"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-3">
                <span className="flex items-center gap-2 font-semibold">
                  <span>{t.icon}</span>
                  {t.title}
                  <span className="font-mono text-xs text-muted">{t.slug}</span>
                </span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  <span>{lessons.length} درس</span>
                  {quiz && (
                    <span className="rounded-full bg-brand-cyan/15 px-2 py-0.5 text-brand-cyan">
                      اختبار: {quiz.questions.length} سؤال
                    </span>
                  )}
                </span>
              </summary>
              <ul className="divide-y divide-border border-t border-border">
                {lessons.map((l) => (
                  <li
                    key={l.slug}
                    className="flex items-center justify-between gap-3 px-4 py-2.5"
                  >
                    <span className="min-w-0">
                      <span className="text-xs text-muted">{l.order}.</span>{" "}
                      <span className="font-medium">{l.title}</span>
                    </span>
                    <Link
                      href={`/admin/content/${t.slug}/${l.slug}`}
                      className="shrink-0 rounded-lg border border-border px-3 py-1 text-xs font-semibold transition hover:bg-surface"
                    >
                      {writable ? "تحرير" : "عرض"}
                    </Link>
                  </li>
                ))}
                {lessons.length === 0 && (
                  <li className="px-4 py-3 text-sm text-muted">لا توجد دروس.</li>
                )}
              </ul>
            </details>
          );
        })}
      </div>

      {/* Blog posts */}
      <h2 className="mb-3 mt-8 text-lg font-bold">
        المقالات{" "}
        <span className="text-sm font-normal text-muted">
          ({posts.length} مقال)
        </span>
      </h2>
      <ul className="divide-y divide-border rounded-xl border border-border">
        {posts.map((p) => (
          <li
            key={p.slug}
            className="flex items-center justify-between gap-3 px-4 py-2.5"
          >
            <span className="min-w-0 truncate font-medium">{p.title}</span>
            <span className="flex shrink-0 items-center gap-3">
              <span className="font-mono text-xs text-muted">{p.date}</span>
              <Link
                href={`/blog/${p.slug}`}
                className="rounded-lg border border-border px-3 py-1 text-xs font-semibold transition hover:bg-surface"
              >
                عرض
              </Link>
            </span>
          </li>
        ))}
        {posts.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted">لا توجد مقالات.</li>
        )}
      </ul>
    </div>
  );
}

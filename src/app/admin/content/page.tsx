import type { Metadata } from "next";
import Link from "next/link";
import { getTracks, getLessons } from "@/lib/content";
import { hasQuiz, getQuiz } from "@/lib/quiz";
import { hasExamBank, getExamQuestionPool } from "@/lib/quiz-bank";
import { getPosts } from "@/lib/blog";
import { isContentWritable } from "@/lib/admin-content";
import { listDbTracks, listDbLessons } from "@/lib/admin-cms";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { Forbidden } from "../_components/gates";
import { createTrack, createLesson, deleteTrack } from "./actions";

export const metadata: Metadata = {
  title: "إدارة المحتوى",
  robots: { index: false, follow: false },
};

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "content:edit")) return <Forbidden role={access.role} />;

  const { saved, error } = await searchParams;
  const tracks = await getTracks();
  const trackLessons = await Promise.all(
    tracks.map(async (t) => ({ t, lessons: await getLessons(t.slug) }))
  );
  const dbTracks = await listDbTracks();
  const dbTrackSlugs = new Set(dbTracks.map((t) => t.slug));
  const dbLessons = await listDbLessons();
  const dbLessonId = new Map(
    dbLessons.map((l) => [`${l.track}/${l.slug}`, l.id])
  );
  const posts = getPosts();
  const writable = isContentWritable();
  // UI mirror of the server-side content:publish rule in ./actions.ts.
  const canPublish = can(access.role, "content:publish");
  // Public readers only return published DB lessons, so unpublished drafts
  // and in-review pages are listed separately to stay reachable.
  const unpublished = dbLessons.filter((l) => !l.published);

  return (
    <div>
      <h1 className="text-2xl font-bold">المحتوى والتوثيق</h1>
      <p className="mt-1 text-sm text-muted">
        أنشئ لغات وصفحات جديدة من هنا — تظهر مباشرة على الموقع دون برمجة.
      </p>

      {saved && (
        <p className="mt-4 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-500">
          ✓ تم{" "}
          {saved === "track"
            ? "إنشاء اللغة"
            : saved === "deleted"
              ? "الحذف"
              : "الحفظ"}
          .
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          ✗ تحقّق من الحقول (المُعرّف والعنوان مطلوبان).
        </p>
      )}

      {unpublished.length > 0 && (
        <div className="mt-6 rounded-xl border border-border bg-surface/50">
          <h2 className="border-b border-border px-4 py-3 text-sm font-bold">
            صفحات غير منشورة (مسودات وقيد المراجعة)
          </h2>
          <ul className="divide-y divide-border">
            {unpublished.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="font-mono text-xs text-muted">{l.track}/</span>
                  <span className="font-medium">{l.title}</span>
                  <span className="ms-2 text-xs text-muted">({l.status})</span>
                </span>
                <Link
                  href={`/admin/content/db/${l.id}`}
                  className="shrink-0 rounded-lg border border-border px-3 py-1 text-xs font-semibold transition hover:bg-surface"
                >
                  تحرير
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* New language (publishing act: new tracks are live immediately) */}
      {canPublish && (
      <details className="mt-6 rounded-xl border border-brand-purple/40 bg-brand-purple/5">
        <summary className="cursor-pointer px-4 py-3 font-bold text-brand-purple">
          ＋ لغة جديدة
        </summary>
        <form action={createTrack} className="grid gap-3 p-4 sm:grid-cols-2">
          <Field name="title" label="العنوان (مثل: Ruby)" required />
          <Field name="slug" label="المُعرّف بالـ URL (مثل: ruby)" required dir="ltr" />
          <Field name="icon" label="أيقونة (إيموجي)" placeholder="💎" />
          <Field name="color" label="اللون" placeholder="#B026FF" dir="ltr" />
          <div className="sm:col-span-2">
            <Field name="description" label="وصف قصير" />
          </div>
          <div className="sm:col-span-2">
            <button className="rounded-lg bg-brand-purple px-5 py-2 font-semibold text-white transition hover:opacity-90">
              إنشاء اللغة
            </button>
          </div>
        </form>
      </details>
      )}

      {!writable && (
        <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
          ⚠️ دروس الملفات (الأصلية) للقراءة فقط في الإنتاج. أمّا الدروس المُنشأة من
          هنا (قاعدة البيانات) فقابلة للتحرير دائمًا.
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
        {trackLessons.map(({ t, lessons }) => {
          const quiz = hasQuiz(t.slug) ? getQuiz(t.slug) : null;
          // Secure-exam-only tracks (AI/ML) have no legacy quiz, so without
          // this they would show no assessment at all in this listing.
          const secureCount = hasExamBank(t.slug)
            ? getExamQuestionPool(t.slug).length
            : 0;
          const isDbTrack = dbTrackSlugs.has(t.slug);
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
                  {isDbTrack && (
                    <span className="rounded bg-brand-purple/15 px-1.5 py-0.5 text-[10px] font-bold text-brand-purple">
                      DB
                    </span>
                  )}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted">
                  <span>{lessons.length} درس</span>
                  {quiz && (
                    <span className="rounded-full bg-brand-cyan/15 px-2 py-0.5 text-brand-cyan">
                      اختبار: {quiz.questions.length} سؤال
                    </span>
                  )}
                  {secureCount > 0 && (
                    <span className="rounded-full bg-brand-purple/15 px-2 py-0.5 text-brand-purple">
                      اختبار آمن: {secureCount} سؤال
                    </span>
                  )}
                </span>
              </summary>

              <ul className="divide-y divide-border border-t border-border">
                {lessons.map((l) => {
                  const dbId = dbLessonId.get(`${t.slug}/${l.slug}`);
                  const href = dbId
                    ? `/admin/content/db/${dbId}`
                    : `/admin/content/${t.slug}/${l.slug}`;
                  return (
                    <li
                      key={l.slug}
                      className="flex items-center justify-between gap-3 px-4 py-2.5"
                    >
                      <span className="min-w-0">
                        <span className="text-xs text-muted">{l.order}.</span>{" "}
                        <span className="font-medium">{l.title}</span>
                        {dbId && (
                          <span className="ms-2 rounded bg-brand-purple/15 px-1 text-[10px] font-bold text-brand-purple">
                            DB
                          </span>
                        )}
                      </span>
                      <Link
                        href={href}
                        className="shrink-0 rounded-lg border border-border px-3 py-1 text-xs font-semibold transition hover:bg-surface"
                      >
                        {dbId || writable ? "تحرير" : "عرض"}
                      </Link>
                    </li>
                  );
                })}
                {lessons.length === 0 && (
                  <li className="px-4 py-3 text-sm text-muted">لا توجد دروس.</li>
                )}
              </ul>

              {/* New page in this track */}
              <form
                action={createLesson}
                className="flex flex-wrap items-end gap-2 border-t border-border p-3"
              >
                <input type="hidden" name="track" value={t.slug} />
                <Field name="title" label="عنوان الصفحة الجديدة" required compact />
                <Field name="slug" label="المُعرّف (اختياري)" dir="ltr" compact />
                <div className="w-20">
                  <label className="mb-1 block text-xs text-muted">الترتيب</label>
                  <input
                    name="order"
                    type="number"
                    defaultValue={lessons.length + 1}
                    className="w-full rounded-lg border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-brand-purple"
                  />
                </div>
                <button className="rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90">
                  ＋ صفحة
                </button>
              </form>

              {isDbTrack && canPublish && (
                <form action={deleteTrack} className="border-t border-border px-3 py-2">
                  <input type="hidden" name="slug" value={t.slug} />
                  <button className="text-xs text-red-500 transition hover:underline">
                    🗑️ حذف اللغة وكل صفحاتها
                  </button>
                </form>
              )}
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
      </ul>
    </div>
  );
}

function Field({
  name,
  label,
  required,
  placeholder,
  dir,
  compact,
}: {
  name: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  dir?: "ltr" | "rtl";
  compact?: boolean;
}) {
  return (
    <div className={compact ? "min-w-40 flex-1" : ""}>
      <label className="mb-1 block text-xs text-muted">{label}</label>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        dir={dir}
        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-brand-purple"
      />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDbLesson } from "@/lib/admin-cms";
import { getTrack } from "@/lib/content";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { Forbidden } from "../../../_components/gates";
import { updateDbLesson, deleteDbLesson } from "../../actions";

export const metadata: Metadata = {
  title: "تحرير صفحة",
  robots: { index: false, follow: false },
};

export default async function DbLessonEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "content:edit")) return <Forbidden role={access.role} />;

  const { id } = await params;
  const { saved } = await searchParams;
  const lesson = await getDbLesson(id);
  if (!lesson) notFound();

  const track = await getTrack(lesson.track);

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted">
        <Link href="/admin/content" className="hover:text-foreground">
          المحتوى
        </Link>
        <span>/</span>
        <span>{track?.title ?? lesson.track}</span>
        <span>/</span>
        <span className="text-foreground">{lesson.slug}</span>
        <span className="rounded bg-brand-purple/15 px-1.5 py-0.5 text-[10px] font-bold text-brand-purple">
          DB
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{lesson.title}</h1>
        <Link
          href={`/learn/${lesson.track}/${lesson.slug}`}
          className="rounded-lg border border-border px-3 py-1 text-xs font-semibold transition hover:bg-surface"
        >
          عرض الصفحة ↗
        </Link>
      </div>

      {saved && (
        <p className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-500">
          ✓ تم الحفظ — التغييرات ظاهرة على الموقع.
        </p>
      )}

      <form action={updateDbLesson} className="space-y-4">
        <input type="hidden" name="id" value={lesson.id} />

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-muted">العنوان</span>
            <input
              name="title"
              defaultValue={lesson.title}
              required
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-purple"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-muted">الترتيب</span>
            <input
              name="order"
              type="number"
              defaultValue={lesson.order}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-purple"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-muted">الوصف (لمحركات البحث)</span>
            <input
              name="description"
              defaultValue={lesson.description}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-purple"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block text-xs text-muted">
              كلمات مفتاحية (مفصولة بفواصل)
            </span>
            <input
              name="keywords"
              defaultValue={lesson.keywords ?? ""}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand-purple"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-xs text-muted">المحتوى (MDX)</span>
          <textarea
            name="content"
            defaultValue={lesson.content}
            dir="ltr"
            spellCheck={false}
            rows={24}
            className="w-full rounded-xl border border-border bg-surface p-4 font-mono text-sm leading-relaxed outline-none focus:border-brand-purple"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="published"
            defaultChecked={lesson.published}
            className="h-4 w-4 accent-brand-purple"
          />
          منشور (مرئي على الموقع)
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="rounded-lg bg-brand-purple px-5 py-2 font-semibold text-white transition hover:opacity-90"
          >
            حفظ التغييرات
          </button>
        </div>
      </form>

      <form action={deleteDbLesson} className="mt-6 border-t border-border pt-4">
        <input type="hidden" name="id" value={lesson.id} />
        <button className="text-sm text-red-500 transition hover:underline">
          🗑️ حذف هذه الصفحة
        </button>
      </form>
    </div>
  );
}

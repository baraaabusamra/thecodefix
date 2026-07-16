import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import matter from "gray-matter";
import { getTrack } from "@/lib/content";
import { readRawLesson, isContentWritable } from "@/lib/admin-content";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { Forbidden } from "../../../_components/gates";
import { saveLesson } from "../../actions";

export const metadata: Metadata = {
  title: "تحرير درس",
  robots: { index: false, follow: false },
};

export default async function LessonEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ track: string; lesson: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "content:edit")) return <Forbidden role={access.role} />;

  const { track, lesson } = await params;
  const { saved } = await searchParams;

  const raw = readRawLesson(track, lesson);
  if (raw === null) notFound();

  const trackMeta = await getTrack(track);
  const { data } = matter(raw);
  const writable = isContentWritable();

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted">
        <Link href="/admin/content" className="hover:text-foreground">
          المحتوى
        </Link>
        <span>/</span>
        <span>{trackMeta?.title ?? track}</span>
        <span>/</span>
        <span className="text-foreground">{lesson}</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {typeof data.title === "string" ? data.title : lesson}
        </h1>
        <Link
          href={`/learn/${track}/${lesson}`}
          className="rounded-lg border border-border px-3 py-1 text-xs font-semibold transition hover:bg-surface"
        >
          عرض الدرس ↗
        </Link>
      </div>

      {saved && (
        <p className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-500">
          ✓ تم حفظ التغييرات.
        </p>
      )}

      {!writable && (
        <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
          ⚠️ وضع القراءة فقط (الإنتاج). شغّل المشروع محليًا للتحرير.
        </p>
      )}

      <form action={saveLesson}>
        <input type="hidden" name="track" value={track} />
        <input type="hidden" name="slug" value={lesson} />
        <textarea
          name="content"
          defaultValue={raw}
          readOnly={!writable}
          dir="ltr"
          spellCheck={false}
          rows={28}
          className="w-full rounded-xl border border-border bg-surface p-4 font-mono text-sm leading-relaxed outline-none focus:border-brand-purple"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="submit"
            disabled={!writable}
            className="rounded-lg bg-brand-purple px-5 py-2 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            حفظ التغييرات
          </button>
          <span className="text-xs text-muted">
            يشمل الواجهة الأمامية (frontmatter) ومحتوى MDX.
          </span>
        </div>
      </form>
    </div>
  );
}

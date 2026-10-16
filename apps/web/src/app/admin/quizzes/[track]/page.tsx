import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTrack } from "@tcf/content/tracks";
import { readRawQuiz } from "@tcf/assessment/admin/quizzes";
import { isContentWritable } from "@tcf/content/admin/writer";
import { resolveAdmin } from "@tcf/identity/admin-access";
import { can } from "@tcf/identity/rbac";
import { Forbidden } from "../../_components/gates";
import { saveQuiz } from "@tcf/assessment/actions/admin-quizzes";

export const metadata: Metadata = {
  title: "تحرير اختبار",
  robots: { index: false, follow: false },
};

export default async function QuizEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ track: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "content:edit")) return <Forbidden role={access.role} />;

  const { track } = await params;
  const { saved, error } = await searchParams;

  const raw = readRawQuiz(track);
  if (raw === null) notFound();

  const trackMeta = await getTrack(track);
  const writable = isContentWritable();

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted">
        <Link href="/admin/quizzes" className="hover:text-foreground">
          الاختبارات
        </Link>
        <span>/</span>
        <span className="text-foreground">{trackMeta?.title ?? track}</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">اختبار {trackMeta?.title ?? track}</h1>
        <Link
          href={`/quiz/${track}`}
          className="rounded-lg border border-border px-3 py-1 text-xs font-semibold transition hover:bg-surface"
        >
          فتح الاختبار ↗
        </Link>
      </div>

      {saved && (
        <p className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-500">
          ✓ تم حفظ التغييرات.
        </p>
      )}
      {error === "json" && (
        <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          ✗ JSON غير صالح — لم يُحفظ. يجب أن يحتوي على title و questions.
        </p>
      )}
      {!writable && (
        <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
          ⚠️ وضع القراءة فقط (الإنتاج). شغّل المشروع محليًا للتحرير.
        </p>
      )}

      <form action={saveQuiz}>
        <input type="hidden" name="track" value={track} />
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
            بنية: {"{ title, questions: [{ q, options, answer, explain }] }"}
          </span>
        </div>
      </form>
    </div>
  );
}

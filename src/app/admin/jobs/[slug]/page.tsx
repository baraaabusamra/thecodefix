import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJob } from "@/lib/jobs";
import { readRawJob } from "@/lib/admin-jobs";
import { isContentWritable } from "@/lib/admin-content";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { Forbidden } from "../../_components/gates";
import { saveJob } from "../actions";

export const metadata: Metadata = {
  title: "تحرير وظيفة",
  robots: { index: false, follow: false },
};

export default async function JobEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "jobs:moderate")) return <Forbidden role={access.role} />;

  const { slug } = await params;
  const { saved, error } = await searchParams;

  const raw = readRawJob(slug);
  if (raw === null) notFound();

  const job = getJob(slug);
  const writable = isContentWritable();

  return (
    <div>
      <div className="mb-4 flex items-center gap-2 text-sm text-muted">
        <Link href="/admin/jobs" className="hover:text-foreground">
          الوظائف
        </Link>
        <span>/</span>
        <span className="text-foreground">{slug}</span>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{job?.title ?? slug}</h1>
        <Link
          href={`/jobs/${slug}`}
          className="rounded-lg border border-border px-3 py-1 text-xs font-semibold transition hover:bg-surface"
        >
          عرض الإعلان ↗
        </Link>
      </div>

      {job && (
        <p className="mb-4 text-sm text-muted">
          {job.company} — {job.location} · {job.type}
          {job.salary ? ` · ${job.salary}` : ""}
        </p>
      )}

      {saved && (
        <p className="mb-4 rounded-lg border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-500">
          ✓ تم حفظ التغييرات.
        </p>
      )}
      {error === "json" && (
        <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          ✗ JSON غير صالح — لم يُحفظ. تحقّق من الصيغة وحاول مجددًا.
        </p>
      )}

      {!writable && (
        <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-500">
          ⚠️ وضع القراءة فقط (الإنتاج). شغّل المشروع محليًا للتحرير.
        </p>
      )}

      <form action={saveJob}>
        <input type="hidden" name="slug" value={slug} />
        <textarea
          name="content"
          defaultValue={raw}
          readOnly={!writable}
          dir="ltr"
          spellCheck={false}
          rows={26}
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
            بيانات الإعلان بصيغة JSON (يُتحقَّق منها قبل الحفظ).
          </span>
        </div>
      </form>
    </div>
  );
}

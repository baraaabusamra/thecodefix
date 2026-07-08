import type { Metadata } from "next";
import Link from "next/link";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { listOutreach, type OutreachRow } from "@/lib/admin-outreach";
import { Forbidden } from "../../_components/gates";
import NeedsDatabase from "../../_components/NeedsDatabase";
import ConfirmSubmit from "../../_components/ConfirmSubmit";
import { updateOutreach, addOutreach, deleteOutreach } from "./actions";

export const metadata: Metadata = {
  title: "متابعة التواصل",
  robots: { index: false, follow: false },
};

const GUIDE_LABELS: Record<OutreachRow["guide"], string> = {
  funding: "💰 جهات التمويل والدعم",
  instructors: "🧑‍🏫 استقطاب المحاضرين",
};

const CATEGORY_LABELS: Record<string, string> = {
  acc: "حاضنات ومسرعات",
  gov: "جهات حكومية وصناديق",
  vc: "مستثمرون",
  bank: "قروض بنكية",
  comp: "مسابقات ومنح",
  rev: "دخل مباشر للموقع",
  lec: "محاضرون معروفون",
  jor: "الأردن: مجتمعات وجهات",
  plt: "منصات تعليم عربية",
  ig: "صفحات انستغرام",
  other: "أخرى",
};

const STATUS_LABELS: Record<OutreachRow["status"], string> = {
  todo: "لسا",
  contacted: "تم التواصل",
  replied: "في تجاوب",
  done: "منتهي",
  rejected: "غير مناسب",
};

const STATUS_TONES: Record<OutreachRow["status"], string> = {
  todo: "border-border bg-background text-muted",
  contacted: "border-yellow-500/40 bg-yellow-500/10 text-yellow-500",
  replied: "border-blue-500/40 bg-blue-500/10 text-blue-400",
  done: "border-green-500/40 bg-green-500/10 text-green-500",
  rejected: "border-red-500/40 bg-red-500/10 text-red-400",
};

export default async function OutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ guide?: string; saved?: string; error?: string }>;
}) {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "ops:manage")) return <Forbidden role={access.role} />;

  const { guide, saved, error } = await searchParams;
  const activeGuide: "funding" | "instructors" | null =
    guide === "instructors" ? "instructors" : guide === "funding" ? "funding" : null;
  const rows = await listOutreach();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">📇 متابعة التواصل</h1>
        <p className="mt-1 text-sm text-muted">
          جهات التمويل والمحاضرون المرشّحون من أدلة الاستقطاب — حدّث حالة كل جهة
          («لسا» أم «تم») واكتب شو صار معها، والكل يشوف الصورة نفسها.
        </p>
      </div>

      {saved && (
        <p className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm text-green-500">
          {saved === "added" ? "تمت إضافة الجهة." : saved === "deleted" ? "تم حذف الجهة." : "تم الحفظ."}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-500">
          تعذّرت الإضافة — الاسم والدليل مطلوبان.
        </p>
      )}

      {rows === null ? (
        <NeedsDatabase />
      ) : (
        <>
          <GuideTabs active={activeGuide} rows={rows} />
          {(activeGuide ? [activeGuide] : (["funding", "instructors"] as const)).map(
            (g) => (
              <GuideSection key={g} guide={g} rows={rows.filter((r) => r.guide === g)} />
            )
          )}
          <AddForm />
        </>
      )}
    </div>
  );
}

function GuideTabs({
  active,
  rows,
}: {
  active: "funding" | "instructors" | null;
  rows: OutreachRow[];
}) {
  const count = (g: string) => {
    const list = rows.filter((r) => r.guide === g);
    const done = list.filter((r) => r.status !== "todo").length;
    return `${done}/${list.length}`;
  };
  const tab = (href: string, label: string, isActive: boolean) => (
    <Link
      href={href}
      className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
        isActive
          ? "border-brand-purple bg-brand-purple/15 text-brand-purple"
          : "border-border bg-surface hover:border-brand-purple/50"
      }`}
    >
      {label}
    </Link>
  );
  return (
    <div className="flex flex-wrap gap-2">
      {tab("/admin/operations/outreach", "الكل", active === null)}
      {tab(
        "/admin/operations/outreach?guide=funding",
        `💰 التمويل (${count("funding")})`,
        active === "funding"
      )}
      {tab(
        "/admin/operations/outreach?guide=instructors",
        `🧑‍🏫 المحاضرون (${count("instructors")})`,
        active === "instructors"
      )}
    </div>
  );
}

function GuideSection({
  guide,
  rows,
}: {
  guide: "funding" | "instructors";
  rows: OutreachRow[];
}) {
  if (rows.length === 0) return null;
  const categories = [...new Set(rows.map((r) => r.category))];
  const done = rows.filter((r) => r.status !== "todo").length;
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-bold">{GUIDE_LABELS[guide]}</h2>
        <span className="text-xs text-muted">
          تم التحرك مع {done} من {rows.length}
        </span>
      </div>
      <div className="space-y-5">
        {categories.map((cat) => (
          <div key={cat}>
            <p className="mb-2 text-xs font-bold text-muted">
              {CATEGORY_LABELS[cat] ?? cat} ({rows.filter((r) => r.category === cat).length})
            </p>
            <div className="space-y-2">
              {rows
                .filter((r) => r.category === cat)
                .map((r) => (
                  <ContactRow key={r.id} r={r} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ContactRow({ r }: { r: OutreachRow }) {
  return (
    <details className="rounded-xl border border-border bg-surface">
      <summary className="cursor-pointer select-none px-4 py-3">
        <div className="inline-flex w-[calc(100%-1.5rem)] flex-wrap items-center justify-between gap-2">
          <span className="font-semibold">{r.name}</span>
          <span className="flex items-center gap-2 text-xs">
            {r.report && <span title="يوجد تقرير">📝</span>}
            <span
              className={`rounded-full border px-2.5 py-0.5 font-semibold ${STATUS_TONES[r.status]}`}
            >
              {STATUS_LABELS[r.status]}
            </span>
          </span>
        </div>
      </summary>
      <div className="space-y-3 border-t border-border px-4 py-3">
        {r.description && <p className="text-sm text-muted">{r.description}</p>}
        {r.url && (
          <a
            href={r.url}
            target="_blank"
            rel="noopener noreferrer"
            dir="ltr"
            className="inline-block text-xs text-accent underline"
          >
            {r.url}
          </a>
        )}
        <form action={updateOutreach} className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
          <input type="hidden" name="id" value={r.id} />
          <label className="text-xs text-muted">
            الحالة
            <select
              name="status"
              defaultValue={r.status}
              className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-brand-purple/60"
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted">
            التقرير — شو صار مع هالجهة؟ (من تواصل، الرد، الاتفاق…)
            <textarea
              name="report"
              rows={2}
              defaultValue={r.report ?? ""}
              className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-brand-purple/60"
            />
          </label>
          <button className="btn-neon self-end px-5 py-2 text-sm">حفظ</button>
        </form>
        <div className="flex items-center justify-between text-xs text-muted">
          <span>
            آخر تحديث: {new Date(r.updatedAt).toLocaleDateString("ar-EG", { month: "short", day: "numeric" })}
            {r.updatedByName ? ` — ${r.updatedByName}` : ""}
          </span>
          <form action={deleteOutreach}>
            <input type="hidden" name="id" value={r.id} />
            <ConfirmSubmit
              label="🗑 حذف"
              message={`ستُحذف «${r.name}» نهائيًّا من المتتبّع.`}
              className="text-red-400 hover:underline"
            />
          </form>
        </div>
      </div>
    </details>
  );
}

function AddForm() {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <h2 className="mb-4 text-lg font-bold">➕ أضف جهة جديدة</h2>
      <form action={addOutreach} className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          الدليل
          <select
            name="guide"
            className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-brand-purple/60"
          >
            <option value="funding">💰 التمويل والدعم</option>
            <option value="instructors">🧑‍🏫 المحاضرون</option>
          </select>
        </label>
        <label className="text-sm">
          الاسم
          <input
            name="name"
            required
            className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-brand-purple/60"
          />
        </label>
        <label className="text-sm">
          الرابط (اختياري)
          <input
            name="url"
            dir="ltr"
            placeholder="https://..."
            className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm outline-none placeholder:text-muted/60 focus:border-brand-purple/60"
          />
        </label>
        <label className="text-sm">
          وصف قصير (اختياري)
          <input
            name="description"
            className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm outline-none focus:border-brand-purple/60"
          />
        </label>
        <div className="sm:col-span-2">
          <button className="btn-neon px-6 py-2 text-sm">إضافة</button>
        </div>
      </form>
    </section>
  );
}

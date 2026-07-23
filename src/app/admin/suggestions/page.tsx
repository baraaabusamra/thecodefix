import type { Metadata } from "next";
import { requireAdminCapability } from "@/lib/admin-access";
import { listSuggestions } from "@/lib/admin-suggestions";
import type { Suggestion } from "@/db/schema";
import NeedsDatabase from "../_components/NeedsDatabase";
import { setSuggestionStatus, deleteSuggestion } from "./actions";

export const metadata: Metadata = {
  title: "اقتراحات المجتمع",
  robots: { index: false, follow: false },
};

const TYPE_LABELS: Record<string, string> = {
  language: "لغة",
  feature: "خاصية",
  other: "أخرى",
};

const STATUS_LABELS: Record<string, string> = {
  new: "جديد",
  planned: "مخطّط",
  done: "تمّ",
  declined: "مرفوض",
};

const STATUS_TONES: Record<string, string> = {
  new: "text-brand-cyan",
  planned: "text-yellow-500",
  done: "text-green-500",
  declined: "text-red-500",
};

export default async function AdminSuggestionsPage() {
  await requireAdminCapability("content:edit");

  const rows = await listSuggestions();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">اقتراحات المجتمع</h1>
        <p className="mt-1 text-sm text-muted">
          لغات وخصائص يطلبها الزوّار من صندوق الاقتراحات على الموقع.
        </p>
      </div>

      {rows === null ? (
        <NeedsDatabase />
      ) : (
        <SuggestionsTable rows={rows} />
      )}
    </div>
  );
}

function SuggestionsTable({ rows }: { rows: Suggestion[] }) {
  const counts = {
    total: rows.length,
    new: rows.filter((r) => r.status === "new").length,
    planned: rows.filter((r) => r.status === "planned").length,
  };

  return (
    <>
      <div className="mb-3 grid grid-cols-3 gap-3">
        <Stat label="الكل" value={counts.total} />
        <Stat label="جديد" value={counts.new} />
        <Stat label="مخطّط" value={counts.planned} />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-muted">
            <tr>
              <th className="px-3 py-2 text-start font-semibold">النوع</th>
              <th className="px-3 py-2 text-start font-semibold">الاقتراح</th>
              <th className="px-3 py-2 text-start font-semibold">البريد</th>
              <th className="px-3 py-2 text-start font-semibold">التاريخ</th>
              <th className="px-3 py-2 text-center font-semibold">الحالة</th>
              <th className="px-3 py-2 text-center font-semibold">حذف</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr key={s.id} className="border-t border-border align-top">
                <td className="px-3 py-2 font-medium whitespace-nowrap">
                  {TYPE_LABELS[s.type] ?? s.type}
                </td>
                <td className="px-3 py-2 max-w-md whitespace-pre-wrap break-words">
                  {s.message}
                </td>
                <td className="px-3 py-2">
                  {s.email ? (
                    <a
                      href={`mailto:${s.email}`}
                      dir="ltr"
                      className="font-mono text-xs text-brand-cyan hover:underline"
                    >
                      {s.email}
                    </a>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-xs text-muted">
                  {new Date(s.createdAt).toLocaleDateString("ar-EG", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-3 py-2">
                  <form action={setSuggestionStatus} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={s.id} />
                    <select
                      name="status"
                      defaultValue={s.status}
                      className={`rounded-lg border border-border bg-background px-2 py-1 text-xs outline-none focus:border-brand-purple ${STATUS_TONES[s.status] ?? ""}`}
                    >
                      {Object.entries(STATUS_LABELS).map(([v, label]) => (
                        <option key={v} value={v}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button className="rounded-lg border border-border px-2 py-1 text-xs font-semibold transition hover:bg-surface">
                      حفظ
                    </button>
                  </form>
                </td>
                <td className="px-3 py-2 text-center">
                  <form action={deleteSuggestion}>
                    <input type="hidden" name="id" value={s.id} />
                    <button className="rounded-lg px-2 py-1 text-xs text-red-500 transition hover:bg-red-500/10">
                      🗑️
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  لا توجد اقتراحات بعد.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
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

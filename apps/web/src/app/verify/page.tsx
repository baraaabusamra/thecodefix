import type { Metadata } from "next";
import { redirect } from "next/navigation";

// The entry-point form only. A submitted ?code= redirects to the canonical
// path-based route (/verify/[certificateId]) — see that route for the
// actual lookup/result UI and its dynamic per-certificate metadata.
export const metadata: Metadata = {
  title: "التحقّق من الشهادة",
  description:
    "تأكّد من صحّة أي شهادة صادرة عن The Code Fix برقمها — أداة تحقّق رسمية لأصحاب العمل والمتعلّمين.",
  keywords: [
    "التحقق من شهادة",
    "التحقق من شهادة برمجة",
    "شهادة The Code Fix",
    "التأكد من صحة الشهادة",
  ],
  alternates: { canonical: "/verify" },
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const query = (code ?? "").trim();
  if (query) redirect(`/verify/${encodeURIComponent(query)}`);

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-center text-3xl font-bold">التحقّق من الشهادة</h1>
      <p className="mt-2 text-center text-sm text-muted">
        أدخل رقم الشهادة للتأكّد من صحّتها.
      </p>

      <form action="/verify" className="mx-auto mt-8 flex max-w-md gap-2">
        <input
          name="code"
          dir="ltr"
          placeholder="TCF-..."
          className="flex-1 rounded-lg border border-border bg-surface px-4 py-2 text-center font-mono outline-none focus:border-brand-purple"
        />
        <button className="rounded-lg bg-brand-purple px-5 py-2 font-semibold text-white transition hover:opacity-90">
          تحقّق
        </button>
      </form>
    </div>
  );
}

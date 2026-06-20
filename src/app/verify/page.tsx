import type { Metadata } from "next";
import { findCertificate } from "@/lib/admin-certificates";

export const metadata: Metadata = {
  title: "التحقّق من الشهادة",
  description: "تأكّد من صحّة شهادة The Code Fix برقمها.",
};

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const query = (code ?? "").trim();
  const cert = query ? await findCertificate(query) : undefined;

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-center text-3xl font-bold">التحقّق من الشهادة</h1>
      <p className="mt-2 text-center text-sm text-muted">
        أدخل رقم الشهادة للتأكّد من صحّتها.
      </p>

      <form action="/verify" className="mx-auto mt-8 flex max-w-md gap-2">
        <input
          name="code"
          defaultValue={query}
          dir="ltr"
          placeholder="TCF-..."
          className="flex-1 rounded-lg border border-border bg-surface px-4 py-2 text-center font-mono outline-none focus:border-brand-purple"
        />
        <button className="rounded-lg bg-brand-purple px-5 py-2 font-semibold text-white transition hover:opacity-90">
          تحقّق
        </button>
      </form>

      {query && (
        <div className="mx-auto mt-8 max-w-md">
          {cert === null ? (
            <Box tone="muted" title="التحقّق غير متاح">
              خدمة التحقّق غير مفعّلة حاليًا.
            </Box>
          ) : cert === undefined ? (
            <Box tone="error" title="✗ شهادة غير صالحة">
              لا توجد شهادة بهذا الرقم:{" "}
              <span dir="ltr" className="font-mono">
                {query}
              </span>
            </Box>
          ) : (
            <Box tone="success" title="✓ شهادة موثّقة">
              <ul className="space-y-1 text-sm">
                <li>
                  <span className="text-muted">الاسم:</span>{" "}
                  <span className="font-semibold">{cert.recipientName}</span>
                </li>
                <li>
                  <span className="text-muted">المسار:</span>{" "}
                  <span className="font-semibold">{cert.trackTitle}</span>
                </li>
                <li>
                  <span className="text-muted">النتيجة:</span> {cert.score}/
                  {cert.total}
                </li>
                <li>
                  <span className="text-muted">التاريخ:</span>{" "}
                  {cert.issuedAt.toISOString().slice(0, 10)}
                </li>
                <li dir="ltr" className="font-mono text-xs text-muted">
                  {cert.certId}
                </li>
              </ul>
            </Box>
          )}
        </div>
      )}
    </div>
  );
}

function Box({
  tone,
  title,
  children,
}: {
  tone: "success" | "error" | "muted";
  title: string;
  children: React.ReactNode;
}) {
  const styles = {
    success: "border-green-500/40 bg-green-500/10 text-green-500",
    error: "border-red-500/40 bg-red-500/10 text-red-500",
    muted: "border-border bg-surface text-muted",
  }[tone];
  return (
    <div className={`rounded-xl border p-5 ${styles}`}>
      <p className="mb-2 text-lg font-bold">{title}</p>
      <div className="text-foreground">{children}</div>
    </div>
  );
}

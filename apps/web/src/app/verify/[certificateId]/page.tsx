import type { Metadata } from "next";
import Link from "next/link";
import { findCertificate, certificateTrust } from "@tcf/certificates/certificates";
import { SITE_URL } from "@tcf/core/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}): Promise<Metadata> {
  const { certificateId } = await params;
  const found = await findCertificate(certificateId).catch(() => null);
  // Only server-graded certificates get a personalized, shareable preview.
  const cert = found && certificateTrust(found) === "verified" ? found : null;
  const title = cert ? `شهادة ${cert.recipientName} — ${cert.trackTitle}` : "التحقّق من الشهادة";
  const description = cert
    ? `${cert.recipientName} أتمّ بنجاح مسار ${cert.trackTitle} على The Code Fix — تعلّم البرمجة بالعربي.`
    : "تأكّد من صحّة أي شهادة صادرة عن The Code Fix برقمها — أداة تحقّق رسمية لأصحاب العمل والمتعلّمين.";
  return {
    title,
    description,
    alternates: { canonical: `/verify/${certificateId}` },
    // Personalized, low-value-for-search page — same rationale as /certificate/[tech].
    robots: { index: false, follow: true },
    openGraph: cert
      ? {
          title,
          description,
          url: `/verify/${certificateId}`,
          type: "article",
          images: [
            {
              url: `${SITE_URL}/api/cert-og?code=${encodeURIComponent(certificateId)}`,
              width: 1200,
              height: 630,
              alt: title,
            },
          ],
        }
      : undefined,
  };
}

export default async function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ certificateId: string }>;
}) {
  const { certificateId } = await params;
  const cert = await findCertificate(certificateId);
  const trust = cert ? certificateTrust(cert) : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="text-center text-3xl font-bold">التحقّق من الشهادة</h1>
      <p dir="ltr" className="mt-2 text-center font-mono text-sm text-muted">
        {certificateId}
      </p>

      <div className="mx-auto mt-8 max-w-md">
        {cert === null ? (
          <Box tone="muted" title="التحقّق غير متاح">
            خدمة التحقّق غير مفعّلة حاليًا.
          </Box>
        ) : cert === undefined ? (
          <Box tone="error" title="✗ شهادة غير صالحة">
            لا توجد شهادة بهذا الرقم.
          </Box>
        ) : trust === "revoked" ? (
          <Box tone="error" title="⚠ شهادة مُلغاة">
            <p>
              <span className="text-muted">الاسم:</span>{" "}
              <span className="font-semibold">{cert.recipientName}</span>
            </p>
            <p className="mt-2">هذه الشهادة أُلغيت من قِبل The Code Fix ولم تعد صالحة.</p>
          </Box>
        ) : trust === "legacy" ? (
          // Recorded by the retired flow that trusted a browser-reported
          // score: shown neutrally, never with the verified wording or score.
          <Box tone="muted" title="سجلّ إتمام قديم — غير موثّق">
            <ul className="space-y-1 text-sm">
              <li>
                <span>الاسم المُدخَل:</span>{" "}
                <span className="font-semibold">{cert.recipientName}</span>
              </li>
              <li>
                <span>المسار:</span>{" "}
                <span className="font-semibold">{cert.trackTitle}</span>
              </li>
            </ul>
            <p className="mt-2">
              صدر هذا السجلّ بنظام سابق اعتمد على نتيجة أبلغ عنها متصفّح المتعلّم،
              دون اختبار نهائي مصحَّح على الخادم. لذلك لا يُعدّ شهادة موثّقة ولا
              يمكن تأكيد النتيجة أو تاريخ الإصدار.
            </p>
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
                <span className="text-muted">النتيجة:</span> {cert.score}/{cert.total}
              </li>
              <li>
                <span className="text-muted">التاريخ:</span>{" "}
                {cert.issuedAt.toISOString().slice(0, 10)}
              </li>
            </ul>
          </Box>
        )}
      </div>

      <p className="mt-8 text-center text-sm">
        <Link href="/verify" className="text-brand-cyan hover:underline">
          التحقّق من رقم شهادة آخر
        </Link>
      </p>
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

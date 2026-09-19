"use client";

import Link from "next/link";
import { useState, useEffect, useRef, useCallback } from "react";
import { trackProductEvent } from "@/lib/analytics";
import { useProgress, setName, PASS_RATIO } from "@/lib/progress";
import { SITE_URL } from "@/lib/site";
import CertificateNamePrefill from "@/components/CertificateNamePrefill";
import CertificateArtwork from "@/components/CertificateArtwork";

export default function Certificate({
  track,
  trackTitle,
  authEnabled,
}: {
  track: string;
  trackTitle: string;
  authEnabled: boolean;
}) {
  const progress = useProgress();
  const [draftName, setDraftName] = useState("");

  // Prefill from the verified sign-in name so a signed-in user isn't asked
  // to hand-type their own name — they can still edit it before issuing.
  const prefillName = useCallback(
    (name: string) => {
      if (!progress.name && !draftName) setDraftName(name);
    },
    [progress.name, draftName]
  );
  const result = progress.quizzes[track];
  const passed = !!result && result.score / result.total >= PASS_RATIO;

  // This track has no server-graded exam yet, so the result above is
  // self-reported (browser localStorage). It produces a printable completion
  // document only — never a database record, certificate ID, QR code, or
  // /verify link. Verified certificates come exclusively from
  // SecureCertificate (server-graded exam → issueSecureCertificate).
  const shown = useRef(false);
  useEffect(() => {
    if (passed && progress.name && !shown.current) {
      shown.current = true;
      trackProductEvent("certificate_issue", { track });
    }
  }, [passed, progress.name, track]);

  if (!passed) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <span className="text-5xl">🔒</span>
        <h1 className="mt-4 text-2xl font-bold">الشهادة غير متاحة بعد</h1>
        <p className="mt-2 text-muted">
          عليك اجتياز اختبار {trackTitle} أولًا للحصول على الشهادة.
        </p>
        <Link
          href={`/quiz/${track}`}
          className="mt-6 inline-block rounded-xl bg-brand-purple px-6 py-3 font-semibold text-white"
        >
          ابدأ الاختبار
        </Link>
      </div>
    );
  }

  if (!progress.name) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        {authEnabled && <CertificateNamePrefill onName={prefillName} />}
        <h1 className="mb-4 text-2xl font-bold">اكتب اسمك على الشهادة</h1>
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="الاسم الكامل"
          aria-label="الاسم الكامل للشهادة"
          className="mb-4 w-full rounded-xl border border-border bg-surface px-4 py-3 text-center outline-none"
        />
        <button
          onClick={() => draftName.trim() && setName(draftName.trim())}
          className="w-full rounded-xl bg-brand-purple px-6 py-3 font-semibold text-white disabled:opacity-50"
          disabled={!draftName.trim()}
        >
          إصدار الشهادة
        </button>
      </div>
    );
  }

  // Share the track page, not a verify URL: a self-reported completion has
  // nothing to verify.
  const shareUrl = `${SITE_URL}/learn/${track}`;

  function shareTo(platform: "linkedin" | "x" | "whatsapp") {
    const text = `أتممت مسار ${trackTitle} على The Code Fix 🎉 تعلّم البرمجة بالعربي`;
    const links: Record<typeof platform, string> = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl}`)}`,
    };
    trackProductEvent("certificate_share", { platform, track });
    window.open(links[platform], "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 print:m-0 print:max-w-none print:p-0">
      <CertificateArtwork
        recipientName={progress.name}
        trackTitle={trackTitle}
        issuedAt={result.passedAt}
        unverified
      />

      <div className="mt-6 print:hidden">
        <p className="mb-3 text-center text-sm font-semibold text-muted">
          شارك إنجازك:
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => shareTo("linkedin")}
            className="rounded-xl bg-[#0A66C2] px-5 py-3 font-semibold text-white transition hover:opacity-90"
          >
            in شارك على LinkedIn
          </button>
          <button
            onClick={() => shareTo("x")}
            className="rounded-xl bg-black px-5 py-3 font-semibold text-white transition hover:opacity-90"
          >
            𝕏 شارك
          </button>
          <button
            onClick={() => shareTo("whatsapp")}
            className="rounded-xl bg-[#25D366] px-5 py-3 font-semibold text-white transition hover:opacity-90"
          >
            واتساب
          </button>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => window.print()}
            className="rounded-xl bg-brand-purple px-6 py-3 font-semibold text-white"
          >
            🖨️ طباعة / حفظ PDF
          </button>
          <Link
            href="/account"
            className="rounded-xl border border-border px-6 py-3 font-semibold hover:text-foreground"
          >
            لوحة حسابي
          </Link>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted print:hidden">
        هذه وثيقة إتمام غير موثّقة، مبنية على نتيجة محفوظة في متصفحك. الشهادات
        الموثّقة القابلة للتحقّق تصدر فقط بعد اجتياز الاختبار النهائي المصحَّح على
        الخادم.
      </p>
    </div>
  );
}

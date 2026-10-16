"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { markSignupStarted, trackProductEvent } from "@tcf/observability/analytics";
import { useSession, signIn } from "next-auth/react";
import { issueSecureCertificate, getMyCertificateStatus } from "../actions/certificate";
import { SITE_URL } from "@tcf/core/site";
import CertificateNamePrefill from "./CertificateNamePrefill";
import CertificateArtwork from "./CertificateArtwork";

// Certificate issuance for tracks with a real exam bank (currently: html).
// Unlike the legacy <Certificate>, this NEVER reads a client-side "passed"
// flag or score — issueSecureCertificate() derives eligibility and score
// entirely server-side from the latest passed exam_attempt row. `name` is
// the only client input, purely cosmetic (sanitized server-side too).
export default function SecureCertificate({
  track,
  trackTitle,
}: {
  track: string;
  trackTitle: string;
}) {
  const { status: sessionStatus } = useSession();
  const [draftName, setDraftName] = useState("");
  const [prefilled, setPrefilled] = useState(false);
  const [state, setState] = useState<
    | { phase: "checking" }
    | { phase: "need_name" }
    | { phase: "issuing" }
    | { phase: "issued"; certId: string; issuedAt: string }
    | { phase: "not_eligible" }
    | { phase: "error" }
  >({ phase: "checking" });

  const prefillName = useCallback((name: string) => {
    setPrefilled(true);
    setDraftName((d) => d || name);
  }, []);

  // On mount: if a certificate for this track already exists (issued in a
  // previous visit), jump straight to it instead of asking for a name again.
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    let cancelled = false;
    getMyCertificateStatus(track).then((res) => {
      if (cancelled) return;
      if (res.issued) {
        setDraftName(res.recipientName);
        setState({ phase: "issued", certId: res.certId, issuedAt: res.issuedAt });
      } else {
        setState({ phase: "need_name" });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [sessionStatus, track]);

  const issue = useCallback(async () => {
    const name = draftName.trim();
    if (!name) return;
    setState({ phase: "issuing" });
    const res = await issueSecureCertificate(track, name);
    if (!res.ok) {
      setState(res.reason === "not_eligible" ? { phase: "not_eligible" } : { phase: "error" });
      return;
    }
    trackProductEvent("certificate_issue", { track });
    setState({ phase: "issued", certId: res.certId, issuedAt: new Date().toISOString() });
  }, [draftName, track]);

  if (sessionStatus === "loading") return null;

  if (sessionStatus === "unauthenticated") {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <span className="text-5xl">🔒</span>
        <h1 className="mt-4 text-2xl font-bold">سجّل الدخول لاستلام شهادتك</h1>
        <p className="mt-2 text-muted">الشهادة مرتبطة بحسابك وقابلة للتحقّق باسمك.</p>
        <button
          onClick={() => {
            markSignupStarted("certificate");
            void signIn();
          }}
          className="btn-neon mt-6 px-6 py-3"
        >
          تسجيل الدخول
        </button>
      </div>
    );
  }

  if (state.phase === "checking") return null;

  if (state.phase === "not_eligible") {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <span className="text-5xl">🔒</span>
        <h1 className="mt-4 text-2xl font-bold">الشهادة غير متاحة بعد</h1>
        <p className="mt-2 text-muted">عليك اجتياز الاختبار النهائي لمسار {trackTitle} أولًا.</p>
        <Link href={`/quiz/${track}`} className="mt-6 inline-block rounded-xl bg-brand-purple px-6 py-3 font-semibold text-white">
          اذهب للاختبار النهائي
        </Link>
      </div>
    );
  }

  if (state.phase === "error") {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center text-red-500">
        تعذّر إصدار الشهادة — أعد المحاولة لاحقًا.
      </div>
    );
  }

  if (state.phase === "need_name" || state.phase === "issuing") {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <CertificateNamePrefill onName={prefillName} />
        <h1 className="mb-4 text-2xl font-bold">اكتب اسمك على الشهادة</h1>
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="الاسم الكامل"
          aria-label="الاسم الكامل للشهادة"
          maxLength={100}
          className="mb-4 w-full rounded-xl border border-border bg-surface px-4 py-3 text-center outline-none"
        />
        <button
          onClick={issue}
          disabled={!draftName.trim() || state.phase === "issuing"}
          className="w-full rounded-xl bg-brand-purple px-6 py-3 font-semibold text-white disabled:opacity-50"
        >
          {state.phase === "issuing" ? "جارٍ الإصدار…" : "إصدار الشهادة"}
        </button>
        {!prefilled && (
          <p className="mt-3 text-xs text-muted">لن نستخدم اسمك إلا على هذه الشهادة.</p>
        )}
      </div>
    );
  }

  // issued
  const { certId, issuedAt } = state;
  const verifyUrl = `${SITE_URL}/verify/${certId}`;
  const recipient = draftName.trim();

  function shareTo(platform: "linkedin" | "x" | "whatsapp") {
    const text = `حصلت على شهادة إتمام مسار ${trackTitle} من The Code Fix 🎉 تعلّم البرمجة بالعربي`;
    const links: Record<typeof platform, string> = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verifyUrl)}`,
      x: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(verifyUrl)}`,
      whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text} ${verifyUrl}`)}`,
    };
    trackProductEvent("certificate_share", { platform, track });
    window.open(links[platform], "_blank", "noopener,noreferrer");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 print:m-0 print:max-w-none print:p-0">
      <CertificateArtwork
        recipientName={recipient}
        trackTitle={trackTitle}
        issuedAt={issuedAt}
        certId={certId}
        verifyUrl={verifyUrl}
      />

      <div className="mt-6 print:hidden">
        <p className="mb-3 text-center text-sm font-semibold text-muted">شارك إنجازك:</p>
        <div className="flex flex-wrap justify-center gap-3">
          <button onClick={() => shareTo("linkedin")} className="rounded-xl bg-[#0A66C2] px-5 py-3 font-semibold text-white transition hover:opacity-90">
            in شارك على LinkedIn
          </button>
          <button onClick={() => shareTo("x")} className="rounded-xl bg-black px-5 py-3 font-semibold text-white transition hover:opacity-90">
            𝕏 شارك
          </button>
          <button onClick={() => shareTo("whatsapp")} className="rounded-xl bg-[#25D366] px-5 py-3 font-semibold text-white transition hover:opacity-90">
            واتساب
          </button>
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-3">
          <button onClick={() => window.print()} className="rounded-xl bg-brand-purple px-6 py-3 font-semibold text-white">
            🖨️ طباعة / حفظ PDF
          </button>
          <Link href="/account" className="rounded-xl border border-border px-6 py-3 font-semibold hover:text-foreground">
            لوحة حسابي
          </Link>
        </div>
      </div>

      <p className="mt-4 text-center text-xs text-muted print:hidden">
        تحقّق من صحّة الشهادة عبر{" "}
        <Link href={`/verify/${certId}`} className="text-brand-cyan hover:underline">
          صفحة التحقّق
        </Link>
        .
      </p>
    </div>
  );
}

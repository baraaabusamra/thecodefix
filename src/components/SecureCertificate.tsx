"use client";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { Cormorant_Garamond, Montserrat } from "next/font/google";
import QRCode from "qrcode";
import { markSignupStarted, trackProductEvent } from "@/lib/analytics";
import { useSession, signIn } from "next-auth/react";
import { issueSecureCertificate, getMyCertificateStatus } from "@/app/certificate/actions";
import { SITE_URL } from "@/lib/site";
import CertificateNamePrefill from "@/components/CertificateNamePrefill";
import "@/components/certificate.css";

// Faces the certificate artwork was drawn around. `preload: false` keeps them
// off every other page's critical path — only this one ever renders them.
const certDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  variable: "--font-cert-display",
  display: "swap",
  preload: false,
});

const certSans = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-cert-sans",
  display: "swap",
  preload: false,
});

// The artwork's intrinsic size; everything inside is positioned against it.
const CERT_W = 1600;
const CERT_H = 1000;

// Past this many characters the name no longer fits the rule at full size.
const LONG_NAME_CHARS = 26;

function formatCertDate(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())} / ${pad(d.getMonth() + 1)} / ${d.getFullYear()}`;
}

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
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

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

  useEffect(() => {
    if (state.phase !== "issued") return;
    const verifyUrl = `${SITE_URL}/verify/${state.certId}`;
    QRCode.toDataURL(verifyUrl, { margin: 1, width: 220 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [state]);

  // The artwork is a fixed 1600x1000 canvas, so it is scaled to the column
  // rather than reflowed — the layout inside it must not move between a phone
  // and a desktop, or the design stops matching the printed sheet.
  useEffect(() => {
    if (state.phase !== "issued") return;
    const el = stageRef.current;
    if (!el) return;
    const update = () => setScale(Math.min(1, el.clientWidth / CERT_W));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [state.phase]);

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
  const date = formatCertDate(issuedAt);
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
      <div
        ref={stageRef}
        className="tcf-cert-stage"
        style={{ height: CERT_H * scale }}
      >
        <div
          id="certificate"
          dir="ltr"
          className={`tcf-cert ${certDisplay.variable} ${certSans.variable}`}
          style={{ ["--tcf-scale" as string]: scale }}
        >
          <div className="tcf-cert-border" />

          <div className="tcf-cert-tl-shape" />
          <div className="tcf-cert-tl-layer" />
          <div className="tcf-cert-tl-glow" />

          <div className="tcf-cert-circuit" aria-hidden="true">
            <i />
            <i />
            <b />
            <b />
          </div>

          <div className="tcf-cert-br-shape" />
          <div className="tcf-cert-br-line" />

          <div className="tcf-cert-wave tcf-cert-wave1" />
          <div className="tcf-cert-wave tcf-cert-wave2" />
          <div className="tcf-cert-wave tcf-cert-wave3" />

          <div className="tcf-cert-logo">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="" aria-hidden="true" />
            <div>
              <div className="tcf-cert-logo-text">
                TheCode<span>Fix</span>
              </div>
              <div className="tcf-cert-logo-sub">LEARN • PRACTICE • GROW</div>
            </div>
          </div>

          <div className="tcf-cert-future">
            BUILD
            <br />
            YOUR
            <br />
            FUTURE
          </div>

          <div className="tcf-cert-title">CERTIFICATE</div>

          <div className="tcf-cert-subtitle-row">
            <div className="tcf-cert-subtitle-line" />
            <div className="tcf-cert-subtitle">
              OF COMP<span>L</span>ETION
            </div>
            <div className="tcf-cert-subtitle-line" />
          </div>

          <div className="tcf-cert-awarded">THIS CERTIFICATE IS PROUDLY AWARDED TO</div>

          <div className="tcf-cert-recipient">
            <div
              className="tcf-cert-recipient-name"
              dir="auto"
              data-long={recipient.length > LONG_NAME_CHARS}
            >
              {recipient}
            </div>
            <div className="tcf-cert-recipient-label">RECIPIENT NAME</div>
          </div>

          <div className="tcf-cert-completed">FOR SUCCESSFULLY COMPLETING</div>

          <div className="tcf-cert-course">
            <div className="tcf-cert-course-name" dir="auto">
              {trackTitle}
            </div>
          </div>

          <div className="tcf-cert-desc">
            IN RECOGNITION OF DEDICATION, EFFORT, AND COMMITMENT TO LEARNING WITH THE CODE FIX.
          </div>

          <div className="tcf-cert-date">
            <div className="tcf-cert-date-value">{date}</div>
            <div className="tcf-cert-date-label">DATE (DD / MM / YYYY)</div>
          </div>

          <div className="tcf-cert-qr">
            <span />
            <span />
            <span />
            <span />
            {qrDataUrl && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={qrDataUrl} alt={`رمز QR للتحقّق من الشهادة ${certId}`} />
            )}
          </div>

          <div className="tcf-cert-code">
            <em>CERTIFICATE ID</em>
            {certId}
          </div>

          <div className="tcf-cert-seal">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/thecodefix-seal.png" alt="" aria-hidden="true" />
          </div>

          <div className="tcf-cert-tagline">
            CODE
            <br />
            A BRIGHTER
            <br />
            TOMORROW
          </div>
        </div>
      </div>

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

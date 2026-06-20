"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useProgress, setName, PASS_RATIO } from "@/lib/progress";
import { issueCertificate } from "@/app/certificate/actions";

export default function Certificate({
  track,
  trackTitle,
}: {
  track: string;
  trackTitle: string;
}) {
  const progress = useProgress();
  const [draftName, setDraftName] = useState("");
  const result = progress.quizzes[track];
  const passed = !!result && result.score / result.total >= PASS_RATIO;
  const certId = result
    ? `TCF-${track.toUpperCase()}-${Date.parse(result.passedAt)
        .toString(36)
        .toUpperCase()}`
    : "";

  // Record a verifiable certificate once, when the user has a passing result
  // and a name. No-ops server-side unless the visitor is signed in.
  const recorded = useRef(false);
  useEffect(() => {
    if (passed && progress.name && certId && result && !recorded.current) {
      recorded.current = true;
      issueCertificate({
        certId,
        track,
        trackTitle,
        name: progress.name,
        score: result.score,
        total: result.total,
        issuedAt: result.passedAt,
      }).catch(() => {});
    }
  }, [passed, progress.name, certId, track, trackTitle, result]);

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
        <h1 className="mb-4 text-2xl font-bold">اكتب اسمك على الشهادة</h1>
        <input
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="الاسم الكامل"
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

  const date = new Date(result.passedAt).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div
        id="certificate"
        className="relative overflow-hidden rounded-3xl border-2 border-brand-purple bg-surface p-10 text-center neon-glow print:border-black"
      >
        <p className="neon-text text-lg font-bold">The Code Fix</p>
        <p className="mt-8 text-muted">تشهد منصّة The Code Fix بأنّ</p>
        <h1 className="my-4 text-4xl font-extrabold">{progress.name}</h1>
        <p className="text-muted">قد أتمّ بنجاح مسار</p>
        <h2 className="my-3 text-2xl font-bold neon-text">{trackTitle}</h2>
        <p className="text-muted">
          بنتيجة {result.score} من {result.total}
        </p>
        <div className="mt-10 flex items-center justify-between text-sm text-muted">
          <span>التاريخ: {date}</span>
          <span dir="ltr">رقم: {certId}</span>
        </div>
      </div>

      <div className="mt-6 flex justify-center gap-3 print:hidden">
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

      <p className="mt-4 text-center text-xs text-muted print:hidden">
        تحقّق من صحّة الشهادة عبر{" "}
        <Link href={`/verify?code=${certId}`} className="text-brand-cyan hover:underline">
          صفحة التحقّق
        </Link>{" "}
        (للحسابات المسجَّلة).
      </p>
    </div>
  );
}

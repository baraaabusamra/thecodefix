"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportClientBoundaryError } from "@/lib/client-monitoring";

export default function AppError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    reportClientBoundaryError("app_error", error.digest);
  }, [error.digest]);

  return (
    <main className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-5xl" aria-hidden>⚠️</p>
      <h1 className="mt-5 text-3xl font-extrabold">حدث خطأ غير متوقّع</h1>
      <p className="mt-3 text-muted">
        سجّلنا المشكلة تلقائيًا. جرّب مرة ثانية، وإذا استمرت ارجع للصفحة الرئيسية.
      </p>
      {error.digest && (
        <p className="mt-3 text-xs text-muted" dir="ltr">Reference: {error.digest}</p>
      )}
      <div className="mt-7 flex flex-wrap justify-center gap-3">
        <button onClick={unstable_retry} className="btn-neon px-6 py-3">
          حاول مرة أخرى
        </button>
        <Link href="/" className="rounded-xl border border-border px-6 py-3 font-semibold">
          الصفحة الرئيسية
        </Link>
      </div>
    </main>
  );
}

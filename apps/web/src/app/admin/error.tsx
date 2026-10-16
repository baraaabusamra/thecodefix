"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportClientBoundaryError } from "@tcf/observability/client-monitoring";

export default function AdminError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    reportClientBoundaryError("admin_error", error.digest);
  }, [error.digest]);

  return (
    <main className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-2xl font-bold">تعذّر تحميل لوحة الإدارة</h1>
      <p className="mt-3 text-muted">
        تم تسجيل الخطأ بدون عرض تفاصيله الحساسة. حاول مرة أخرى أو ارجع للرئيسية.
      </p>
      {error.digest && (
        <p className="mt-3 text-xs text-muted" dir="ltr">Reference: {error.digest}</p>
      )}
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={unstable_retry} className="btn-neon px-5 py-2.5">
          إعادة المحاولة
        </button>
        <Link href="/admin" className="rounded-xl border border-border px-5 py-2.5">
          لوحة الإدارة
        </Link>
      </div>
    </main>
  );
}

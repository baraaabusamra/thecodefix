"use client";

import { useEffect } from "react";
import { reportClientBoundaryError } from "@tcf/observability/client-monitoring";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    reportClientBoundaryError("global_error", error.digest);
  }, [error.digest]);

  return (
    <html lang="ar" dir="rtl">
      <body style={{ margin: 0, background: "#07060a", color: "#f7f5ff", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ maxWidth: 560, margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
          <title>حدث خطأ — The Code Fix</title>
          <div style={{ fontSize: 52 }} aria-hidden>⚠️</div>
          <h1 style={{ marginTop: 20, fontSize: 30 }}>تعذّر تحميل الموقع</h1>
          <p style={{ color: "#aaa2ba", lineHeight: 1.8 }}>
            سجّلنا المشكلة تلقائيًا. جرّب إعادة التحميل بعد لحظات.
          </p>
          {error.digest && (
            <p style={{ color: "#aaa2ba", fontSize: 12 }} dir="ltr">Reference: {error.digest}</p>
          )}
          <button
            onClick={unstable_retry}
            style={{ marginTop: 24, border: 0, borderRadius: 12, padding: "12px 24px", background: "#a855f7", color: "white", fontWeight: 700, cursor: "pointer" }}
          >
            حاول مرة أخرى
          </button>
        </main>
      </body>
    </html>
  );
}

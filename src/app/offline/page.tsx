import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "غير متصل",
  robots: { index: false, follow: false },
};

export default function OfflinePage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="text-6xl">📡</div>
      <h1 className="mt-4 text-2xl font-bold">غير متصل بالإنترنت</h1>
      <p className="mt-2 text-muted">
        يبدو أنك غير متصل. بعض الدروس المحفوظة متاحة للقراءة دون اتصال.
      </p>
      <a
        href="/"
        className="btn-neon mt-6 inline-flex px-6 py-2.5"
      >
        العودة للرئيسية
      </a>
    </div>
  );
}

import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "الصفحة غير موجودة",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-24 text-center">
      <p className="neon-text-animated text-8xl font-extrabold">404</p>
      <h1 className="mt-4 text-2xl font-bold">عذرًا، لم نجد هذه الصفحة</h1>
      <p className="mt-3 text-muted">
        ربما تغيّر الرابط أو حُذفت الصفحة. لا بأس — تابع التعلّم من هنا:
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/learn" className="btn-neon px-6 py-2.5 text-sm">
          تصفّح المسارات
        </Link>
        <Link
          href="/"
          className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold transition hover:neon-glow"
        >
          الصفحة الرئيسية
        </Link>
        <Link
          href="/search"
          className="rounded-full border border-border px-6 py-2.5 text-sm font-semibold transition hover:neon-glow"
        >
          ابحث عن درس
        </Link>
      </div>
    </div>
  );
}

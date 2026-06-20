import Link from "next/link";
import type { Metadata } from "next";
import { getTracks, getLessons } from "@/lib/content";

export const metadata: Metadata = {
  title: "كل المسارات التعليمية",
  description: "تصفّح جميع مسارات تعلّم البرمجة بالعربي على The Code Fix.",
};

export default function LearnIndex() {
  const tracks = getTracks();
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">المسارات التعليمية</h1>
      <p className="mb-8 text-muted">اختر مسارًا وابدأ رحلتك من الصفر.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tracks.map((t) => (
          <Link
            key={t.slug}
            href={`/learn/${t.slug}`}
            className="group rounded-2xl border border-border bg-surface p-6 transition hover:neon-glow"
          >
            <div className="mb-3 text-3xl">{t.icon}</div>
            <h2 className="mb-1 text-xl font-bold group-hover:neon-text">
              {t.title}
            </h2>
            <p className="mb-4 text-sm text-muted">{t.description}</p>
            <span className="text-sm text-brand-cyan">
              {getLessons(t.slug).length} درس →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

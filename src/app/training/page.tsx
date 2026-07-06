import Link from "next/link";
import type { Metadata } from "next";
import { COUNTRIES } from "@/lib/job-search";
import { BASE_KEYWORDS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "فرص التدريب",
  description:
    "ابحث عن فرص تدريب (Internship) في البرمجة وتطوير الويب والموبايل في كل الدول العربية — روابط بحث جاهزة مفلترة على دولتك وتخصصك.",
  keywords: [
    "تدريب برمجة",
    "فرص تدريب مبرمجين",
    "internship برمجة",
    "تدريب تطوير ويب",
    "تدريب للمبتدئين برمجة",
    "فرص تدريب في العالم العربي",
    ...BASE_KEYWORDS,
  ],
  alternates: { canonical: "/training" },
};

export default function TrainingPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-extrabold">
        فرص <span className="neon-text-animated">التدريب</span>
      </h1>
      <p className="mt-2 leading-relaxed text-muted">
        أول خطوة عملية بعد التعلم: تدريب (Internship) يحوّل معرفتك لخبرة حقيقية.
        اختر دولتك — كل دولة لها صفحة مستقلة بروابط بحث جاهزة مفلترة على فرص
        التدريب وتخصصك.
      </p>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {COUNTRIES.map((c) => (
          <Link
            key={c.slug}
            href={`/training/${c.slug}`}
            className="glass card-glow rounded-2xl p-4 text-center"
          >
            <span className="block text-2xl">{c.flag}</span>
            <span className="mt-1 block text-sm font-bold">{c.nameAr}</span>
          </Link>
        ))}
      </div>

      <Link
        href="/jobs"
        className="mt-8 block rounded-2xl border border-brand-purple/30 bg-brand-purple/5 p-4 text-center font-bold text-brand-purple"
      >
        💼 جاهز لسوق العمل؟ لوحة الوظائف ←
      </Link>
    </div>
  );
}

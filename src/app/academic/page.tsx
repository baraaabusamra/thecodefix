import type { Metadata } from "next";
import Link from "next/link";
import { COUNTRIES } from "@/lib/job-search";
import { hasAcademicData } from "@/lib/academic-universities";
import { BASE_KEYWORDS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "الجانب الأكاديمي — جامعات ومواد بالعربي",
  description:
    "اختر دولتك، جامعتك، وتخصصك — ودليل عملي مرافق لأهم مواد علوم الحاسوب الجامعية بالعربي ومجانًا.",
  keywords: [
    "جامعات عربية علوم حاسوب",
    "تخصصات تكنولوجيا معلومات جامعات عربية",
    "مواد علوم حاسوب بالعربي",
    ...BASE_KEYWORDS,
  ],
  alternates: { canonical: "/academic" },
};

export default function AcademicPage() {
  const countries = COUNTRIES.filter((c) => c.slug !== "remote");

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold md:text-5xl">
          الجانب <span className="neon-text-animated">الأكاديمي</span> 🎓
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">
          اختر دولتك، ثم جامعتك، ثم تخصصك — وبنوريك دليل عملي مرافق لأهم
          مواد التخصص. لا يغني عن المحاضرة أو الامتحان، بس بيرافقك بالتطبيق
          العملي أثناء دراستك.
        </p>
      </div>

      <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {countries.map((c) => {
          const available = hasAcademicData(c.slug);
          return available ? (
            <Link
              key={c.slug}
              href={`/academic/${c.slug}`}
              className="glass card-glow rounded-2xl p-4 text-center"
            >
              <span className="block text-2xl">{c.flag}</span>
              <span className="mt-1 block text-sm font-bold">{c.nameAr}</span>
            </Link>
          ) : (
            <div
              key={c.slug}
              className="rounded-2xl border border-dashed border-border p-4 text-center opacity-50"
            >
              <span className="block text-2xl">{c.flag}</span>
              <span className="mt-1 block text-sm font-bold">{c.nameAr}</span>
              <span className="mt-0.5 block text-[10px] text-muted">قريبًا</span>
            </div>
          );
        })}
      </div>

      <div className="mt-10 text-center">
        <Link
          href="/academic/courses"
          className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:text-foreground"
        >
          أو تصفّح كل المواد مباشرة بدون اختيار جامعة ←
        </Link>
      </div>
    </div>
  );
}

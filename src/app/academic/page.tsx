import type { Metadata } from "next";
import Link from "next/link";
import { getAcademicCourses } from "@/lib/academic";
import { BASE_KEYWORDS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "الجانب الأكاديمي — مواد جامعية بالعربي",
  description:
    "دليل عملي مرافق لأشهر مواد علوم الحاسوب الجامعية: مقدمة في البرمجة، هياكل البيانات والخوارزميات، قواعد البيانات، الشبكات، هندسة البرمجيات، وأمن المعلومات — بالعربي ومجانًا.",
  keywords: [
    "مواد علوم حاسوب بالعربي",
    "شرح هياكل البيانات والخوارزميات",
    "مادة قواعد البيانات بالعربي",
    "مقدمة في البرمجة CS101",
    "مساعدة مواد جامعية برمجة",
    ...BASE_KEYWORDS,
  ],
  alternates: { canonical: "/academic" },
};

export default function AcademicPage() {
  const courses = getAcademicCourses();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold md:text-5xl">
          الجانب <span className="neon-text-animated">الأكاديمي</span> 🎓
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">
          دليل عملي مرافق لأشهر مواد علوم الحاسوب الجامعية — لا يغني عن
          المحاضرة أو الامتحان، بس بيرافقك بالتطبيق العملي والأمثلة
          التفاعلية أثناء دراستك.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {courses.map((c) => (
          <Link
            key={c.slug}
            href={`/academic/${c.slug}`}
            className="group glass card-glow rounded-2xl p-6"
          >
            <div className="flex items-center gap-3">
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl"
                style={{
                  backgroundColor: `color-mix(in srgb, ${c.color} 20%, transparent)`,
                  boxShadow: `0 0 28px -12px ${c.color}`,
                }}
              >
                {c.icon}
              </span>
              <div className="min-w-0">
                <h2 className="font-bold group-hover:neon-text">{c.title}</h2>
                <p className="text-xs text-muted">{c.topics.length} وحدة</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted">{c.description}</p>
            <span
              className="mt-4 inline-block text-sm font-semibold"
              style={{ color: c.color }}
            >
              استعرض المادة →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

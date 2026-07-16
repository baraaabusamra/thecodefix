import Link from "next/link";
import type { Metadata } from "next";
import { getPosts } from "@/lib/blog";
import { BASE_KEYWORDS } from "@/lib/seo";

export const metadata: Metadata = {
  title: "المدوّنة",
  description:
    "مقالات عربية عن تعلّم البرمجة: مقارنات بين اللغات، حلول الأخطاء الشائعة، نصائح المسار المهني، وخطط عملية للمبتدئين والمحترفين.",
  keywords: [
    "مدونة برمجة بالعربي",
    "مقالات برمجة",
    "حل أخطاء البرمجة",
    "مقارنة لغات البرمجة",
    ...BASE_KEYWORDS,
  ],
  alternates: { canonical: "/blog" },
};

export default function BlogIndex() {
  const posts = getPosts();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-4xl font-extrabold">
        <span className="neon-text-animated">المدوّنة</span>
      </h1>
      <p className="mb-8 text-muted">مقالات ونصائح بالعربي في تعلّم البرمجة.</p>
      <div className="space-y-4">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="glass card-glow block rounded-2xl p-6"
          >
            <p className="mb-1 text-xs text-muted">
              {new Date(p.date).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h2 className="mb-2 text-xl font-bold hover:neon-text">{p.title}</h2>
            <p className="text-sm text-muted">{p.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { getRoadmaps } from "@/lib/roadmaps";

export const metadata: Metadata = {
  title: "خرائط الطريق — تعلّم البرمجة بالترتيب الصحيح",
  description:
    "خرائط طريق عربية لتعلّم البرمجة خطوة بخطوة: مطوّر واجهات أمامية، خلفية، متكامل، تطبيقات جوال، وأساسيات علوم الحاسوب.",
  alternates: { canonical: "/roadmaps" },
};

export default function RoadmapsPage() {
  const roadmaps = getRoadmaps();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="text-center">
        <h1 className="text-4xl font-extrabold md:text-5xl">
          خرائط <span className="neon-text-animated">الطريق</span> 🗺️
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-muted">
          لا تعرف من أين تبدأ؟ اختر هدفك واتبع المسار خطوة بخطوة — من الصفر حتى
          الاحتراف، مع روابط مباشرة لكل مرحلة.
        </p>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        {roadmaps.map((r) => (
          <Link
            key={r.slug}
            href={`/roadmaps/${r.slug}`}
            className="group glass card-glow rounded-2xl p-6"
          >
            <div className="flex items-center gap-3">
              <span
                className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-2xl"
                style={{
                  backgroundColor: `color-mix(in srgb, ${r.color} 20%, transparent)`,
                  boxShadow: `0 0 28px -12px ${r.color}`,
                }}
              >
                {r.icon}
              </span>
              <div className="min-w-0">
                <h2 className="font-bold group-hover:neon-text">{r.title}</h2>
                <p className="text-xs text-muted">{r.steps.length} مراحل</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted">{r.description}</p>
            <span
              className="mt-4 inline-block text-sm font-semibold"
              style={{ color: r.color }}
            >
              اتبع المسار →
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

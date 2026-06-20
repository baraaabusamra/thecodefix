import type { Metadata } from "next";
import SubscribeButton from "@/components/SubscribeButton";
import { isPaymentsEnabled } from "@/lib/flags";

export const metadata: Metadata = {
  title: "الأسعار والاشتراك",
  description: "خطط The Code Fix: مجاني، Pro، وتراخيص الشركات.",
};

const tiers = [
  {
    name: "مجاني",
    price: "0",
    features: ["كل الدروس والمسارات", "محرّر الأكواد", "بحث كامل"],
    cta: "ابدأ الآن",
    highlight: false,
  },
  {
    name: "Pro",
    price: "9$",
    features: [
      "كل مزايا المجاني",
      "بدون إعلانات",
      "تحميل المشاريع الكاملة",
      "شهادات إتمام",
      "اختبارات متقدمة",
    ],
    cta: "اشترك في Pro",
    highlight: true,
  },
  {
    name: "الشركات",
    price: "تواصل معنا",
    features: ["مقاعد للفريق", "لوحة تدريب", "تقارير تقدّم", "دعم مخصّص"],
    cta: "اطلب عرضًا",
    highlight: false,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-2 text-center text-3xl font-bold">خطط الاشتراك</h1>
      <p className="mb-10 text-center text-muted">
        ابدأ مجانًا، وارتقِ عندما تكون جاهزًا.
      </p>
      <div className="grid gap-6 md:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`rounded-2xl border bg-surface p-6 ${
              t.highlight ? "border-brand-purple neon-glow" : "border-border"
            }`}
          >
            <h2 className="text-xl font-bold">{t.name}</h2>
            <p className="my-4 text-3xl font-extrabold neon-text">{t.price}</p>
            <ul className="mb-6 space-y-2 text-sm text-muted">
              {t.features.map((f) => (
                <li key={f}>✓ {f}</li>
              ))}
            </ul>
            {t.highlight && isPaymentsEnabled() ? (
              <SubscribeButton label={t.cta} />
            ) : (
              <button className="w-full rounded-lg bg-brand-purple px-4 py-2 font-semibold text-white">
                {t.cta}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

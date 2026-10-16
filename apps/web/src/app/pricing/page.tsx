import type { Metadata } from "next";
import SubscribeButton from "@tcf/billing/ui/SubscribeButton";
import TrackedCta from "@tcf/ui/ui/TrackedCta";
import { isPaymentsEnabled } from "@tcf/core/flags";

export const metadata: Metadata = {
  title: "الأسعار والاشتراك",
  alternates: { canonical: "/pricing" },
  description:
    "خطط The Code Fix: الخطة المجانية بكل الدروس والاختبارات والشهادات، وخطة Pro، وتراخيص الفرق والشركات. تعلّم البرمجة بالعربي مجانًا وابدأ الآن.",
  keywords: [
    "أسعار The Code Fix",
    "اشتراك تعلم البرمجة",
    "كورسات برمجة مجانية",
    "تعلم البرمجة مجانًا بالعربي",
  ],
};

const tiers = [
  {
    kind: "link",
    name: "مجاني",
    price: "0",
    features: ["كل الدروس والمسارات", "محرّر الأكواد", "بحث كامل"],
    cta: "ابدأ الآن",
    href: "/learn",
    highlight: false,
  },
  {
    kind: "pro",
    name: "Pro",
    price: "9$",
    // Only list what code actually enforces for Pro (ENFORCED_PRO_FEATURES in
    // src/lib/flags.ts). Certificates and exams are free for everyone today.
    features: [
      "كل مزايا الخطة المجانية",
      "مزايا Pro قيد التطوير — سنعلن عنها عند تفعيلها",
    ],
    cta: "اشترك في Pro",
    highlight: true,
  },
  {
    kind: "link",
    name: "الشركات",
    price: "تواصل معنا",
    features: ["مقاعد للفريق", "لوحة تدريب", "تقارير تقدّم", "دعم مخصّص"],
    cta: "اطلب عرضًا",
    href: "/contact",
    highlight: false,
  },
] as const;

export default function PricingPage() {
  const paymentsEnabled = isPaymentsEnabled();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="mb-2 text-center text-4xl font-extrabold">
        خطط <span className="neon-text-animated">الاشتراك</span>
      </h1>
      <p className="mb-10 text-center text-muted">
        ابدأ مجانًا، وارتقِ عندما تكون جاهزًا.
      </p>
      <div className="grid items-start gap-6 md:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`glass card-glow relative rounded-2xl p-6 ${
              t.highlight
                ? "border-brand-purple/60 neon-glow md:-translate-y-3"
                : ""
            }`}
          >
            {t.highlight && (
              <span className="btn-neon absolute -top-3 right-6 px-3 py-1 text-xs">
                ★ الأكثر شيوعًا
              </span>
            )}
            <h2 className="text-xl font-bold">{t.name}</h2>
            <p className="my-4 text-4xl font-extrabold neon-text">{t.price}</p>
            <ul className="mb-6 space-y-2 text-sm text-muted">
              {t.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-brand-cyan">✓</span> {f}
                </li>
              ))}
            </ul>
            {t.kind === "pro" ? paymentsEnabled ? (
              <SubscribeButton label={t.cta} />
            ) : (
              <div>
                <div className="flex w-full items-center justify-center rounded-[10px] border border-white/10 bg-white/5 px-4 py-2.5 font-semibold text-muted">
                  الاشتراك قريبًا
                </div>
                <p className="mt-2 text-center text-xs text-muted">
                  نعمل حاليًا على تفعيل الدفع الآمن.
                </p>
              </div>
            ) : (
              <TrackedCta
                href={t.href}
                event="pricing_cta_click"
                properties={{ plan: t.name, destination: t.href }}
                className="btn-neon w-full px-4 py-2.5"
              >
                {t.cta}
              </TrackedCta>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

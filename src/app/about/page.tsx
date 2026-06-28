import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "من نحن",
  alternates: { canonical: "/about" },
  description:
    "The Code Fix — المرجع العربي الأول لتعلّم البرمجة بشروحات واضحة وأمثلة تفاعلية واختبارات وشهادات.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold md:text-4xl">من نحن</h1>
      <p className="mt-4 text-lg text-muted">
        <span className="neon-text font-bold">The Code Fix</span> هو المرجع
        العربي الأول لتعلّم البرمجة — شروحات واضحة، أمثلة تفاعلية، واختبارات
        وشهادات، كلّها بالعربية ومجانًا.
      </p>

      <h2 className="mt-10 text-2xl font-bold">رسالتنا</h2>
      <p className="mt-3 text-muted">
        نؤمن أن اللغة يجب ألّا تكون عائقًا أمام تعلّم البرمجة. لذلك نبني محتوى
        عربيًا عالي الجودة يأخذ المتعلّم من الصفر إلى الاحتراف، خطوة بخطوة،
        وبأمثلة عملية يمكن تجربتها مباشرة في المتصفّح.
      </p>

      <h2 className="mt-10 text-2xl font-bold">ماذا نقدّم</h2>
      <ul className="mt-3 space-y-2 text-muted">
        <li>📚 مسارات تعليمية متدرّجة في أشهر لغات وتقنيات البرمجة.</li>
        <li>⚡ محرّر تفاعلي لتجربة الكود وتشغيله مباشرة.</li>
        <li>🧠 اختبارات قصيرة وشهادات إتمام قابلة للتحقّق.</li>
        <li>💼 لوحة وظائف ومدوّنة تقنية بالعربية.</li>
      </ul>

      <h2 className="mt-10 text-2xl font-bold">رؤيتنا</h2>
      <p className="mt-3 text-muted">
        أن نصبح الوجهة الأولى لكل متعلّم عربي يريد دخول عالم البرمجة والتقنية —
        بمحتوى موثوق، وتجربة تعلّم ممتعة، ومجتمع يدعم بعضه.
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/learn"
          className="rounded-full bg-brand-purple px-6 py-3 font-semibold text-white transition hover:opacity-90"
        >
          ابدأ التعلّم الآن
        </Link>
        <Link
          href="/contact"
          className="rounded-full border border-border px-6 py-3 font-semibold transition hover:bg-surface"
        >
          تواصل معنا
        </Link>
      </div>
    </div>
  );
}

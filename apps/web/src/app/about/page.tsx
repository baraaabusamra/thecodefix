import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "من نحن",
  alternates: { canonical: "/about" },
  description:
    "The Code Fix — المرجع العربي الأول لتعلّم البرمجة بشروحات واضحة وأمثلة تفاعلية واختبارات وشهادات. تعرّف على رسالتنا ورؤيتنا وما نقدّمه للمتعلّم العربي.",
  keywords: [
    "من نحن The Code Fix",
    "منصة تعلم البرمجة بالعربي",
    "تعلم البرمجة بالعربي",
    "The Code Fix",
  ],
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-4xl font-extrabold md:text-5xl">
        من <span className="neon-text-animated">نحن</span>
      </h1>
      <p className="mt-4 text-lg text-muted">
        <span className="neon-text-animated font-bold">The Code Fix</span> هو المرجع
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
        <Link href="/learn" className="btn-neon px-6 py-3">
          ابدأ التعلّم الآن
        </Link>
        <Link
          href="/contact"
          className="glass card-glow rounded-full px-6 py-3 font-semibold text-foreground"
        >
          تواصل معنا
        </Link>
      </div>
    </div>
  );
}

import Link from "next/link";
import { getTracks, getLessons } from "@/lib/content";

export default function Home() {
  const tracks = getTracks();
  const featured = tracks[0]; // أول مسار (HTML) كبطاقة مميّزة

  return (
    <div>
      {/* ===== Hero ===== */}
      <section className="border-b border-border bg-surface">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <span className="rounded-full border border-border bg-background px-4 py-1 text-sm text-muted">
            المرجع العربي الأول للبرمجة 🚀
          </span>
          <h1 className="mt-6 text-5xl font-extrabold leading-[1.1] md:text-7xl">
            تعلّم البرمجة <span className="neon-text">بالعربي</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-muted md:text-xl">
            شروحات واضحة، أمثلة تفاعلية، اختبارات وشهادات — من الصفر إلى الاحتراف
            في {tracks.length}+ مسارًا برمجيًا، مجانًا.
          </p>

          <form
            action="/search"
            className="mx-auto mt-8 flex w-full max-w-xl items-center gap-2 rounded-full border border-border bg-background p-2 neon-glow"
          >
            <input
              name="q"
              placeholder="ابحث عن أي موضوع... مثل: المتغيرات في جافاسكريبت"
              className="flex-1 bg-transparent px-4 py-2 outline-none"
            />
            <button className="rounded-full bg-brand-purple px-6 py-2 font-semibold text-white">
              ابحث
            </button>
          </form>

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/learn"
              className="rounded-full bg-brand-purple px-8 py-3 text-lg font-semibold text-white transition hover:opacity-90"
            >
              ابدأ التعلّم مجانًا
            </Link>
            <Link
              href="/playground"
              className="rounded-full border border-border bg-background px-8 py-3 text-lg font-semibold transition hover:neon-glow"
            >
              جرّب المحرّر ⚡
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Featured big tile (W3Schools-style) ===== */}
      {featured && (
        <section className="mx-auto max-w-6xl px-4 py-14">
          <div
            className="relative overflow-hidden rounded-3xl border border-border p-10 text-center"
            style={{
              background: `linear-gradient(135deg, ${featured.color}22, transparent)`,
            }}
          >
            <div className="text-6xl">{featured.icon}</div>
            <h2 className="mt-4 text-3xl font-extrabold md:text-4xl">
              ابدأ رحلتك مع {featured.title}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-muted">
              {featured.description}
            </p>
            <Link
              href={`/learn/${featured.slug}`}
              className="mt-6 inline-block rounded-full px-10 py-3 text-lg font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: featured.color }}
            >
              تعلّم {featured.title} →
            </Link>
          </div>
        </section>
      )}

      {/* ===== Tracks grid (colored tiles) ===== */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="mb-2 text-center text-3xl font-bold">اختر لغتك</h2>
        <p className="mb-10 text-center text-muted">
          {tracks.length} مسارًا تعليميًا، كل واحد بشروحات واختبار وشهادة.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tracks.map((t) => {
            const count = getLessons(t.slug).length;
            return (
              <div
                key={t.slug}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-surface transition hover:-translate-y-1 hover:neon-glow"
              >
                <div className="h-2" style={{ backgroundColor: t.color }} />
                <div className="flex flex-1 flex-col p-6">
                  <div
                    className="mb-4 grid h-14 w-14 place-items-center rounded-2xl text-3xl"
                    style={{ backgroundColor: `${t.color}22` }}
                  >
                    {t.icon}
                  </div>
                  <h3 className="text-xl font-bold">تعلّم {t.title}</h3>
                  <p className="mt-1 mb-5 flex-1 text-sm text-muted">
                    {t.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">{count} درس</span>
                    <Link
                      href={`/learn/${t.slug}`}
                      className="rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                      style={{ backgroundColor: t.color }}
                    >
                      ابدأ
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ===== Feature sections (W3Schools-style alternating) ===== */}
      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 md:grid-cols-3">
          <Feature
            icon="⚡"
            title="محرّر تفاعلي"
            text="اكتب الكود وشغّله مباشرة في متصفّحك — جافاسكريبت و HTML/CSS بنتيجة فورية."
            href="/playground"
            cta="جرّب المحرّر"
          />
          <Feature
            icon="🧠"
            title="اختبارات وشهادات"
            text="اختبر فهمك بعد كل مسار، واحصل على شهادة إتمام قابلة للطباعة عند النجاح."
            href="/learn"
            cta="ابدأ اختبارًا"
          />
          <Feature
            icon="💼"
            title="وظائف ومدوّنة"
            text="وظائف برمجية في العالم العربي، ومقالات تساعدك في رحلتك المهنية."
            href="/jobs"
            cta="تصفّح الوظائف"
          />
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center">
        <h2 className="text-3xl font-extrabold md:text-4xl">
          جاهز لتبدأ؟ <span className="neon-text">انطلق الآن</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          انضمّ لرحلة تعلّم البرمجة بالعربي — مجانًا وبدون تسجيل.
        </p>
        <Link
          href="/learn"
          className="mt-6 inline-block rounded-full bg-brand-purple px-10 py-3 text-lg font-semibold text-white transition hover:opacity-90"
        >
          استكشف كل المسارات
        </Link>
      </section>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
  href,
  cta,
}: {
  icon: string;
  title: string;
  text: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-background text-3xl neon-glow">
        {icon}
      </div>
      <h3 className="mb-2 text-xl font-bold">{title}</h3>
      <p className="mb-4 text-sm text-muted">{text}</p>
      <Link href={href} className="font-semibold text-brand-cyan hover:underline">
        {cta} →
      </Link>
    </div>
  );
}

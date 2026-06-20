import Link from "next/link";
import { getTracks, getLessons } from "@/lib/content";

export default function Home() {
  const tracks = getTracks();

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Hero — search-first */}
      <section className="flex flex-col items-center gap-6 py-20 text-center">
        <span className="rounded-full border border-border bg-surface px-4 py-1 text-sm text-muted">
          المرجع العربي الأول للبرمجة 🚀
        </span>
        <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">
          تعلّم البرمجة <span className="neon-text">بالعربي</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          شروحات واضحة، أمثلة تفاعلية، ومحرّر أكواد مباشر. من الصفر إلى الاحتراف
          في HTML و CSS و JavaScript و React و Python والمزيد.
        </p>

        <form
          action="/search"
          className="flex w-full max-w-xl items-center gap-2 rounded-xl border border-border bg-surface p-2 neon-glow"
        >
          <input
            name="q"
            placeholder="ابحث عن أي موضوع... مثال: المتغيرات في جافاسكريبت"
            className="flex-1 bg-transparent px-3 py-2 outline-none"
          />
          <button className="rounded-lg bg-brand-purple px-4 py-2 font-semibold text-white">
            ابحث
          </button>
        </form>
      </section>

      {/* Tracks grid */}
      <section className="pb-24">
        <h2 className="mb-6 text-2xl font-bold">المسارات التعليمية</h2>
        {tracks.length === 0 ? (
          <p className="text-muted">لا توجد مسارات بعد.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tracks.map((t) => {
              const count = getLessons(t.slug).length;
              return (
                <Link
                  key={t.slug}
                  href={`/learn/${t.slug}`}
                  className="group rounded-2xl border border-border bg-surface p-6 transition hover:neon-glow"
                >
                  <div className="mb-3 text-3xl">{t.icon}</div>
                  <h3 className="mb-1 text-xl font-bold group-hover:neon-text">
                    {t.title}
                  </h3>
                  <p className="mb-4 text-sm text-muted">{t.description}</p>
                  <span className="text-sm text-brand-cyan">{count} درس →</span>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

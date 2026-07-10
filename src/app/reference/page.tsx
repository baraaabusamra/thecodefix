import type { Metadata } from "next";
import Link from "next/link";
import { REF_SECTIONS, getRefEntries } from "@/lib/reference";
import Breadcrumbs from "@/components/Breadcrumbs";

export const metadata: Metadata = {
  title: "المرجع — مرجع المطوّر العربي",
  description:
    "مرجع عربي أصلي للمطوّرين: وسوم HTML وخصائص CSS ودوال اللغات — شرح واضح، صياغة، أمثلة تجرّبها في المتصفح مباشرة، وأخطاء شائعة.",
  keywords: ["مرجع html بالعربي", "مرجع المطور العربي", "وسوم html", "مرجع برمجة عربي"],
  alternates: { canonical: "/reference" },
};

export default function ReferencePage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <Breadcrumbs
        items={[
          { name: "الرئيسية", href: "/" },
          { name: "المرجع", href: "/reference" },
        ]}
      />
      <h1 className="text-3xl font-extrabold md:text-4xl">
        📖 مرجع المطوّر <span className="neon-text">العربي</span>
      </h1>
      <p className="mt-3 max-w-2xl text-muted">
        صفحة مرجعية لكل وسم وخاصية ودالة — شرح عربي أصلي مع مثال حي تجرّبه
        وتعدّله في متصفحك مباشرة. يكبر المرجع قسمًا بعد قسم.
      </p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {REF_SECTIONS.map((s) => {
          const count = getRefEntries(s.slug).length;
          return (
            <Link
              key={s.slug}
              href={`/reference/${s.slug}`}
              className="glass card-glow rounded-2xl p-6 transition hover:-translate-y-0.5"
            >
              <p className="text-3xl">{s.icon}</p>
              <h2 className="mt-2 text-xl font-bold">{s.title}</h2>
              <p className="mt-1 text-sm text-muted">{s.intro}</p>
              <p className="mt-3 text-sm font-semibold text-accent">
                {count} {s.entityLabel} موثّق ←
              </p>
            </Link>
          );
        })}
        <div className="rounded-2xl border border-dashed border-border p-6 text-muted">
          <p className="text-3xl">🎨</p>
          <h2 className="mt-2 text-xl font-bold">مرجع خصائص CSS</h2>
          <p className="mt-1 text-sm">قريبًا — يُبنى الآن.</p>
        </div>
      </div>
    </div>
  );
}

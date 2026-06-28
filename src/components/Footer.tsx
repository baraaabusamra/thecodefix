import Link from "next/link";

const groups: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "المنصّة",
    links: [
      { href: "/learn", label: "المسارات" },
      { href: "/roadmaps", label: "خرائط الطريق" },
      { href: "/playground", label: "المحرّر" },
      { href: "/blog", label: "المدوّنة" },
      { href: "/jobs", label: "الوظائف" },
    ],
  },
  {
    title: "الشركة",
    links: [
      { href: "/about", label: "من نحن" },
      { href: "/contact", label: "تواصل معنا" },
      { href: "/pricing", label: "الاشتراك" },
    ],
  },
  {
    title: "قانوني",
    links: [
      { href: "/privacy", label: "سياسة الخصوصية" },
      { href: "/terms", label: "شروط الاستخدام" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="relative border-t border-border bg-surface">
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, var(--brand-purple), var(--brand-cyan), transparent)",
        }}
      />
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <p className="neon-text-animated text-lg font-bold">The Code Fix</p>
            <p className="mt-2 text-sm text-muted">
              المرجع العربي الأول لتعلّم البرمجة.
            </p>
          </div>
          {groups.map((g) => (
            <div key={g.title}>
              <p className="mb-3 text-sm font-bold">{g.title}</p>
              <ul className="space-y-2">
                {g.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-muted transition hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-border pt-6 text-sm text-muted md:flex-row">
          <p>© {new Date().getFullYear()} The Code Fix — جميع الحقوق محفوظة</p>
          <p className="neon-text font-semibold">ابنِ. علّم. اربح.</p>
        </div>
      </div>
    </footer>
  );
}

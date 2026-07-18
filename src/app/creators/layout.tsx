import Link from "next/link";

const CREATOR_NAV = [
  { href: "/creators/gallery", label: "المعرض" },
  { href: "/creators/dashboard", label: "لوحة المبدع" },
  { href: "/creators/submit", label: "إرسال فيديو" },
  { href: "/creators/submissions", label: "فيديوهاتي" },
];

export default function CreatorsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <nav className="border-b border-border bg-surface/40">
        <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2">
          {CREATOR_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm text-foreground/80 transition hover:bg-surface hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </>
  );
}

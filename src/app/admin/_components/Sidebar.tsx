"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminSignOut } from "../actions";
import { ROLE_LABELS, type Capability, type Role } from "@/lib/rbac";

type NavItem = {
  href: string;
  label: string;
  icon: string;
  cap: Capability | null; // null = available to anyone with admin:view
  ready: boolean; // false = page not built yet (shown disabled)
};

const NAV: NavItem[] = [
  { href: "/admin", label: "الرئيسية", icon: "📊", cap: null, ready: true },
  { href: "/admin/content", label: "المحتوى والتوثيق", icon: "📚", cap: "content:edit", ready: true },
  { href: "/admin/quizzes", label: "الاختبارات والشهادات", icon: "🎓", cap: "content:edit", ready: true },
  { href: "/admin/users", label: "المستخدمون والدعم", icon: "👥", cap: "users:manage", ready: true },
  { href: "/admin/billing", label: "الاشتراكات والشركات", icon: "💳", cap: "billing:manage", ready: true },
  { href: "/admin/jobs", label: "لوحة الوظائف", icon: "💼", cap: "jobs:moderate", ready: true },
  { href: "/admin/seo", label: "أدوات SEO", icon: "📈", cap: "seo:manage", ready: true },
  { href: "/admin/settings", label: "الإعدادات والصلاحيات", icon: "⚙️", cap: "settings:manage", ready: true },
];

export default function Sidebar({
  role,
  caps,
  mode,
}: {
  role: Role;
  caps: Capability[];
  mode: "rbac" | "token";
}) {
  const pathname = usePathname();
  const items = NAV.filter((i) => i.cap === null || caps.includes(i.cap));

  return (
    <aside className="hidden w-60 shrink-0 border-s border-border bg-surface/40 md:block">
      <div className="sticky top-16 p-4">
        <div className="mb-4 px-2">
          <p className="text-sm font-bold">لوحة الإدارة</p>
          <span className="mt-1 inline-block rounded-full bg-brand-purple/15 px-2 py-0.5 text-xs font-bold text-brand-purple">
            {ROLE_LABELS[role]}
          </span>
        </div>

        <nav className="flex flex-col gap-1">
          {items.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);

            if (!item.ready) {
              return (
                <span
                  key={item.href}
                  className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-muted/60"
                  title="قيد الإنشاء"
                >
                  <span className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    {item.label}
                  </span>
                  <span className="rounded bg-border px-1.5 py-0.5 text-[10px]">
                    قريبًا
                  </span>
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  active
                    ? "bg-brand-purple/15 font-semibold text-brand-purple"
                    : "text-foreground/80 hover:bg-surface"
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {mode === "token" && (
          <form action={adminSignOut} className="mt-4 border-t border-border pt-4">
            <button className="w-full rounded-lg px-3 py-2 text-start text-sm text-muted transition hover:bg-surface hover:text-foreground">
              🔒 إنهاء جلسة المفتاح
            </button>
          </form>
        )}
      </div>
    </aside>
  );
}

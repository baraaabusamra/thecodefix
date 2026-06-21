import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";
import AuthButton from "./AuthButton";
import AdminLink from "./AdminLink";
import MobileMenu from "./MobileMenu";
import { isAuthEnabled } from "@/lib/flags";

const links = [
  { href: "/learn", label: "المسارات" },
  { href: "/roadmaps", label: "خرائط الطريق" },
  { href: "/playground", label: "المحرّر" },
  { href: "/blog", label: "المدوّنة" },
  { href: "/jobs", label: "الوظائف" },
  { href: "/account", label: "حسابي" },
];

// W3Schools-style top nav: dark navy bar, logo, menu links, search, CTA.
// Stays a sync server component (only env reads) so every page remains
// statically renderable; the admin gear resolves client-side via <AdminLink/>.
export default function Header() {
  const authOn = isAuthEnabled();
  return (
    <header className="bg-[#282a35] text-white shadow-md">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5">
        {/* Mobile hamburger (md:hidden) */}
        <MobileMenu links={links} />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 text-lg font-bold">
          <Image
            src="/logo.png"
            alt="The Code Fix"
            width={36}
            height={36}
            priority
            className="h-9 w-9 object-contain"
          />
          <span className="neon-text hidden sm:inline">The Code Fix</span>
        </Link>

        {/* Nav links */}
        <nav className="mr-2 hidden items-center md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded px-3 py-2 text-sm text-white/85 transition hover:bg-white/10 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="ms-auto flex items-center gap-2">
          <form
            action="/search"
            className="hidden items-center rounded-full bg-white/10 ps-3 sm:flex"
          >
            <input
              name="q"
              placeholder="بحث..."
              className="w-28 bg-transparent py-1.5 text-sm text-white outline-none placeholder:text-white/50"
            />
            <button className="px-3 py-1.5 text-white/80 hover:text-white">
              🔍
            </button>
          </form>

          <ThemeToggle />

          {authOn ? (
            <AdminLink />
          ) : (
            !!process.env.ADMIN_TOKEN && (
              <Link
                href="/admin"
                className="rounded px-2 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                title="لوحة الإدارة"
              >
                ⚙️
              </Link>
            )
          )}

          {isAuthEnabled() && <AuthButton />}

          <Link
            href="/learn"
            className="rounded-full bg-brand-purple px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            ابدأ مجانًا
          </Link>
        </div>
      </div>
    </header>
  );
}

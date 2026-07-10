import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";
import AuthButton from "./AuthButton";
import AdminLink from "./AdminLink";
import MobileMenu from "./MobileMenu";
import SearchTrigger from "./SearchTrigger";
import { isAuthEnabled } from "@/lib/flags";

const links = [
  { href: "/learn", label: "المسارات" },
  { href: "/reference", label: "المرجع" },
  { href: "/roadmaps", label: "خرائط الطريق" },
  { href: "/playground", label: "المحرّر" },
  { href: "/blog", label: "المدوّنة" },
  { href: "/jobs", label: "الوظائف" },
  { href: "/training", label: "التدريب" },
  { href: "/account", label: "حسابي" },
];

// W3Schools-style top nav: dark navy bar, logo, menu links, search, CTA.
// Stays a sync server component (only env reads) so every page remains
// statically renderable; the admin gear resolves client-side via <AdminLink/>.
export default function Header() {
  const authOn = isAuthEnabled();
  return (
    <header className="border-b border-white/10 bg-[#0b0a12]/80 text-white shadow-lg shadow-black/30 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0b0a12]/70">
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
          {/* Header bar is always dark, so pin a light wordmark color that
              works in both themes (the accent token flips too dark in light mode). */}
          <span className="hidden text-white sm:inline">The Code Fix</span>
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
          <SearchTrigger />

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

          {/* On phones the bar already holds menu + logo + search + theme +
              login; the hero repeats this CTA, so drop it below sm to keep the
              bar on one uncrowded line even at 320px. The wrapper span carries
              the visibility because .btn-neon's own display beats `hidden`. */}
          <span className="hidden sm:block">
            <Link href="/learn" className="btn-neon whitespace-nowrap px-4 py-2 text-sm">
              ابدأ مجانًا
            </Link>
          </span>
        </div>
      </div>
    </header>
  );
}

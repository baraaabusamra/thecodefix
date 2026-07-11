import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "./ThemeToggle";
import AdminLink from "./AdminLink";
import MobileMenu from "./MobileMenu";
import MegaMenu, { type MegaGroup } from "./MegaMenu";
import ExpandableSearch from "./ExpandableSearch";
import UserMenu from "./UserMenu";
import { isAuthEnabled } from "@/lib/flags";
import { getTracks } from "@/lib/content";

const links = [
  { href: "/reference", label: "المرجع" },
  { href: "/roadmaps", label: "خرائط الطريق" },
  { href: "/playground", label: "المحرّر" },
  { href: "/blog", label: "المدوّنة" },
  { href: "/jobs", label: "الوظائف" },
  { href: "/training", label: "التدريب" },
];

// Slug → mega-menu group. Anything unlisted lands in "الأساسيات والمفاهيم"
// so newly added tracks always appear without touching this file.
const GROUP_DEFS: { label: string; icon: string; slugs: string[] }[] = [
  {
    label: "الواجهات الأمامية",
    icon: "🎨",
    slugs: ["html", "css", "javascript", "typescript", "react", "nextjs", "tailwind"],
  },
  {
    label: "الباكند وقواعد البيانات",
    icon: "⚙️",
    slugs: ["nodejs", "python", "django", "php", "laravel", "java", "csharp", "go", "rust", "sql", "mongodb"],
  },
  { label: "تطبيقات الموبايل", icon: "📱", slugs: ["flutter", "kotlin", "swift"] },
  {
    label: "DevOps والأنظمة",
    icon: "🛠️",
    slugs: ["git", "docker", "linux", "networking", "cybersecurity"],
  },
  { label: "الأساسيات والمفاهيم", icon: "🧠", slugs: ["c", "cpp", "dsa", "oop", "rest-api"] },
];

// Slim single-row header: logo, mega-menu tracks dropdown, nav links,
// expandable search, theme, auth area. The old full-width subjects bar is
// gone — its 31 links live inside the "المسارات" mega menu now.
// Stays a server component so every page remains statically renderable.
export default async function Header() {
  const authOn = isAuthEnabled();
  const tracks = await getTracks();

  // Build mega-menu groups; unknown slugs fall into the last group.
  const bySlug = new Map(tracks.map((t) => [t.slug, t]));
  const used = new Set<string>();
  const groups: MegaGroup[] = GROUP_DEFS.map((g) => ({
    label: g.label,
    icon: g.icon,
    tracks: g.slugs
      .filter((s) => bySlug.has(s) && (used.add(s), true))
      .map((s) => {
        const t = bySlug.get(s)!;
        return { slug: t.slug, title: t.title, icon: t.icon };
      }),
  }));
  const leftovers = tracks.filter((t) => !used.has(t.slug));
  if (leftovers.length) {
    groups[groups.length - 1].tracks.push(
      ...leftovers.map((t) => ({ slug: t.slug, title: t.title, icon: t.icon }))
    );
  }

  const mobileLinks = [{ href: "/learn", label: "المسارات" }, ...links];

  return (
    <header className="border-b border-white/10 bg-[#0b0a12]/80 text-white shadow-lg shadow-black/30 backdrop-blur-xl supports-[backdrop-filter]:bg-[#0b0a12]/70">
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5">
        {/* Mobile hamburger (md:hidden) */}
        <MobileMenu links={mobileLinks} />

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

        {/* Nav: mega menu first, then flat links, with room to breathe */}
        <nav className="mr-3 hidden items-center gap-1 md:flex">
          <MegaMenu groups={groups} />
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded px-3 py-2 text-sm text-white/85 transition hover:bg-white/10 hover:text-brand-cyan"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="ms-auto flex items-center gap-1.5">
          <ExpandableSearch />

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

          {/* One component owns the auth area, so CTA and avatar can never
              show together: signed out → دخول + ابدأ مجانًا، signed in → avatar. */}
          {authOn ? (
            <UserMenu />
          ) : (
            <span className="hidden sm:block">
              <Link href="/learn" className="btn-neon whitespace-nowrap px-4 py-2 text-sm">
                ابدأ مجانًا
              </Link>
            </span>
          )}
        </div>
      </div>
    </header>
  );
}

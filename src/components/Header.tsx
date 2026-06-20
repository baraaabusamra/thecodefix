import Link from "next/link";
import ThemeToggle from "./ThemeToggle";
import AuthButton from "./AuthButton";
import { isAuthEnabled } from "@/lib/flags";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="neon-text">&lt;/&gt; The Code Fix</span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
          <Link href="/learn" className="hover:text-foreground transition">
            المسارات
          </Link>
          <Link href="/playground" className="hover:text-foreground transition">
            المحرّر
          </Link>
          <Link href="/blog" className="hover:text-foreground transition">
            المدوّنة
          </Link>
          <Link href="/jobs" className="hover:text-foreground transition">
            الوظائف
          </Link>
          <Link href="/pricing" className="hover:text-foreground transition">
            الاشتراك
          </Link>
          <Link href="/account" className="hover:text-foreground transition">
            حسابي
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/search"
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-muted hover:text-foreground transition"
          >
            🔍 ابحث
          </Link>
          <ThemeToggle />
          {isAuthEnabled() && <AuthButton />}
        </div>
      </div>
    </header>
  );
}

"use client";

import { useSession, signIn, signOut } from "next-auth/react";

// Rendered only when auth is enabled (see Header). Shows sign-in or the
// signed-in user's name with sign-out.
export default function AuthButton() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <span className="text-sm text-muted">...</span>;
  }

  if (session?.user) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden text-sm text-muted sm:inline">
          {session.user.name ?? session.user.email}
        </span>
        <button
          onClick={() => signOut()}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold transition-all duration-200 hover:border-brand-purple hover:text-foreground active:scale-95"
        >
          خروج
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn()}
      className="rounded-full bg-brand-purple px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-brand-purple/40 active:translate-y-0 active:scale-95"
    >
      تسجيل الدخول
    </button>
  );
}

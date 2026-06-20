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
          className="rounded-lg border border-border px-3 py-2 text-sm hover:text-foreground"
        >
          خروج
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => signIn()}
      className="rounded-lg bg-brand-purple px-3 py-2 text-sm font-semibold text-white"
    >
      تسجيل الدخول
    </button>
  );
}

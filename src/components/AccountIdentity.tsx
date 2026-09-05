"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import type { computeGamification } from "@/lib/points";
import { markSignupStarted } from "@/lib/analytics";

// The useSession()-dependent identity block of ProfileCard, split into its
// own component so it's only ever mounted when auth is enabled (checked
// server-side by the caller, see src/app/account/page.tsx). SessionProvider
// isn't rendered at all when auth is dormant (src/app/layout.tsx), and
// calling useSession() outside a SessionProvider crashes — same pattern
// already used by SignInToSaveCert.tsx.
export default function AccountIdentity({
  fallbackName,
  game,
}: {
  fallbackName: string;
  game: ReturnType<typeof computeGamification>;
}) {
  const { data: session } = useSession();
  const user = session?.user ?? null;
  const displayName = user?.name || fallbackName || "متعلّم جديد";
  const initial = (displayName || "؟").trim().charAt(0).toUpperCase();

  return (
    <>
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-brand-purple/50 bg-brand-purple/10 text-xl font-bold text-accent shadow-[0_0_18px_-6px_var(--brand-purple)]">
          {user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            initial
          )}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{displayName}</p>
          <p className="text-sm text-muted">
            {game.level.icon} {game.level.title} · المستوى {game.levelIndex}
          </p>
          {user?.email && (
            <p className="truncate text-xs text-muted/70" dir="ltr">{user.email}</p>
          )}
        </div>
      </div>

      {user ? (
        <button
          onClick={() => signOut()}
          className="mt-3 text-xs font-medium text-muted transition hover:text-foreground"
        >
          تسجيل الخروج
        </button>
      ) : (
        <button
          onClick={() => {
            markSignupStarted("account");
            void signIn();
          }}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-brand-purple/40 bg-brand-purple/10 px-3 py-2 text-xs font-semibold text-accent transition hover:bg-brand-purple/20"
        >
          🔒 سجّل دخول لحفظ تقدّمك عبر كل أجهزتك
        </button>
      )}
    </>
  );
}

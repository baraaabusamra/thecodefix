"use client";

import { useSession, signIn } from "next-auth/react";

// Shown right after passing a quiz (only when auth is enabled, so the
// SessionProvider is guaranteed present). Nudges a guest to sign in at the
// peak-motivation moment so their certificate is saved, verifiable, and
// shareable. Renders nothing once the user is signed in.
export default function SignInToSaveCert() {
  const { status } = useSession();
  if (status !== "unauthenticated") return null;

  return (
    <div className="mt-5 rounded-xl border border-brand-purple/40 bg-brand-purple/10 p-4">
      <p className="font-semibold leading-relaxed">
        🎉 مبروك النجاح! سجل دخولك الآن لحفظ شهادتك الموثقة ومشاركتها مع أصدقائك
      </p>
      <button
        onClick={() => signIn()}
        className="btn-neon mt-3 px-6 py-2 text-sm"
      >
        تسجيل الدخول
      </button>
    </div>
  );
}

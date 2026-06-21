"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden>
      <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-2c-3.2.7-3.9-1.4-3.9-1.4-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.7 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17 4.6 18 4.9 18 4.9c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.4-2.7 5.4-5.3 5.7.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function LoginInner() {
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") ?? "/account";

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center px-4 py-16 text-center">
      <Image
        src="/logo.png"
        alt="The Code Fix"
        width={56}
        height={56}
        className="h-14 w-14 object-contain"
      />
      <h1 className="mt-4 text-2xl font-bold">تسجيل الدخول</h1>
      <p className="mt-2 text-sm text-muted">
        سجّل الدخول لحفظ تقدّمك ونتائج اختباراتك والحصول على شهاداتك — ومزامنتها
        عبر أجهزتك.
      </p>

      <div className="mt-8 flex w-full flex-col gap-3">
        <button
          onClick={() => signIn("github", { callbackUrl })}
          className="flex items-center justify-center gap-3 rounded-xl bg-[#24292e] px-4 py-3 font-semibold text-white transition hover:opacity-90"
        >
          <GitHubMark />
          المتابعة عبر GitHub
        </button>

        <button
          onClick={() => signIn("google", { callbackUrl })}
          className="flex items-center justify-center gap-3 rounded-xl border border-border bg-white px-4 py-3 font-semibold text-[#15151c] transition hover:bg-black/5"
        >
          <GoogleMark />
          المتابعة عبر Google
        </button>
      </div>

      <p className="mt-6 text-xs text-muted">
        بتسجيلك توافق على{" "}
        <Link href="/terms" className="text-brand-cyan hover:underline">
          شروط الاستخدام
        </Link>{" "}
        و{" "}
        <Link href="/privacy" className="text-brand-cyan hover:underline">
          سياسة الخصوصية
        </Link>
        .
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-muted">...</div>}>
      <LoginInner />
    </Suspense>
  );
}

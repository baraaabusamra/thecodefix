import { Suspense } from "react";
import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "تسجيل الدخول",
  description: "سجّل دخولك إلى The Code Fix لحفظ تقدّمك ونتائج اختباراتك وشهاداتك.",
  // Utility page — robots.txt already disallows /login; page-level noindex
  // keeps the URL itself out of the index too.
  robots: { index: false, follow: false },
};

// Server component: decide which OAuth buttons to show based on which providers
// are actually configured (mirrors the conditional provider list in auth.ts),
// so we never render a button that would fail with a Configuration error.
export default function LoginPage() {
  const github = !!process.env.AUTH_GITHUB_ID;
  const google = !!process.env.AUTH_GOOGLE_ID;

  return (
    <Suspense fallback={<div className="py-20 text-center text-muted">...</div>}>
      <LoginForm github={github} google={google} />
    </Suspense>
  );
}

import { Suspense } from "react";
import LoginForm from "./LoginForm";

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

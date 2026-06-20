// Server-side feature flags driven by env vars.
// Auth and payments stay completely dormant (and invisible) until the
// relevant keys are set in the environment (e.g. in Vercel project settings).

export function isAuthEnabled(): boolean {
  return (
    !!process.env.AUTH_SECRET &&
    (!!process.env.AUTH_GITHUB_ID || !!process.env.AUTH_GOOGLE_ID)
  );
}

export function isPaymentsEnabled(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRO_PRICE_ID;
}

// Server-side feature flags driven by env vars.
// Auth and payments stay completely dormant (and invisible) until the
// relevant keys are set in the environment (e.g. in Vercel project settings).

export function isAuthEnabled(): boolean {
  return (
    !!process.env.AUTH_SECRET &&
    (!!process.env.AUTH_GITHUB_ID || !!process.env.AUTH_GOOGLE_ID)
  );
}

/**
 * Pro features that code ACTUALLY gates on an active subscription. Empty
 * today: no route, page or action reads the subscription table, so a Pro
 * checkout would charge customers for nothing. Add an entry here only in the
 * same change that enforces that feature server-side (e.g. via a
 * hasActivePro(userId) check on synced Stripe state).
 */
export const ENFORCED_PRO_FEATURES: readonly string[] = [];

/** Whether the Stripe keys are configured (the webhook works regardless). */
export function hasStripeKeys(): boolean {
  return !!process.env.STRIPE_SECRET_KEY && !!process.env.STRIPE_PRO_PRICE_ID;
}

/**
 * Whether new Pro checkouts may be started: keys configured AND at least one
 * Pro feature is really enforced. Fails closed otherwise.
 */
export function isPaymentsEnabled(): boolean {
  return hasStripeKeys() && ENFORCED_PRO_FEATURES.length > 0;
}

export const CURRICULUM_EXTRACTION_DISABLED_MESSAGE =
  "استخراج المناهج بالذكاء الاصطناعي معطّل حاليًا. لا يتم إجراء أي اتصال بمزوّد AI.";

/**
 * Fail-closed operational gate for the paid curriculum-extraction stage.
 *
 * Provider API keys are intentionally not enough to enable extraction: the
 * review UI was removed, so an explicit server-only opt-in is required before
 * any new result may be written to the quarantine queue.
 */
export function isCurriculumExtractionEnabled(): boolean {
  return process.env.CURRICULUM_EXTRACTION_ENABLED?.trim().toLowerCase() === "true";
}

export function assertCurriculumExtractionEnabled(): void {
  if (!isCurriculumExtractionEnabled()) {
    throw new Error(CURRICULUM_EXTRACTION_DISABLED_MESSAGE);
  }
}

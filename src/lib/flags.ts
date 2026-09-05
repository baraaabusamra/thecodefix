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

import Stripe from "stripe";

// Lazily create the Stripe client only when a key is present, so the app
// builds and runs with payments disabled. Returns null when unconfigured.
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

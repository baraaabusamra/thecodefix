// Single source of truth for the site's public URL.
// Override per-environment with NEXT_PUBLIC_SITE_URL (set it in Vercel).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ar.thecodefix.com"
).replace(/\/$/, "");

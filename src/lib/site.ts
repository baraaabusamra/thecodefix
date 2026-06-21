// Single source of truth for the site's public URL.
// Override per-environment with NEXT_PUBLIC_SITE_URL (set it in Vercel).
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://thecodefix.net"
).replace(/\/$/, "");

// Public contact email shown on the Contact / legal pages.
// TODO: switch to a domain inbox (e.g. info@thecodefix.net) once email
// forwarding is set up at the registrar.
export const CONTACT_EMAIL = "abusamrabaraa7@gmail.com";

export const SITE_NAME = "The Code Fix";

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Baseline security headers applied to every response. (A full CSP is omitted
  // for now because of the inline theme script; the rest are safe to ship.)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      // The old C# "03-oop" lesson was a condensed duplicate of the dedicated
      // OOP series (12–17). Removed it; send any indexed/inbound links to the
      // canonical classes-and-objects lesson instead of 404ing.
      {
        source: "/learn/csharp/03-oop",
        destination: "/learn/csharp/12-classes-objects",
        permanent: true,
      },
      // The 3 curated job postings were placeholder content from launch
      // (generic company names, apply-by-email routed to our own inbox) —
      // never real listings, but /jobs/flutter-intern had become the site's
      // #1 organic page with real JobPosting structured data implying a
      // genuine opening. Removed the fake postings; redirect their indexed
      // URLs to the matching real country page (Jooble-backed listings).
      {
        source: "/jobs/flutter-intern",
        destination: "/jobs/egypt",
        permanent: true,
      },
      {
        source: "/jobs/frontend-react-riyadh",
        destination: "/jobs/saudi-arabia",
        permanent: true,
      },
      {
        source: "/jobs/backend-nodejs-remote",
        destination: "/jobs/remote",
        permanent: true,
      },
      // cors-error.mdx and cors-error-fix.mdx were two live, indexed posts
      // targeting the identical query/intent (CORS "blocked by policy").
      // Consolidated into cors-error-fix.mdx (the newer, deeper article —
      // its unique useful bits from the older post were merged in first)
      // rather than leaving both to cannibalize each other in search.
      {
        source: "/blog/cors-error",
        destination: "/blog/cors-error-fix",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

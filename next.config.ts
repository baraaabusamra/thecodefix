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
      // how-to-learn-programming.mdx was an orphan (zero inbound editorial
      // links) covering the identical "how do I start learning to code"
      // intent as the newer, more comprehensive where-to-start-programming-2026
      // post. Its one genuinely unique FAQ item (age) was merged in first.
      {
        source: "/blog/how-to-learn-programming",
        destination: "/blog/where-to-start-programming-2026",
        permanent: true,
      },
      // best-language-for-beginners.mdx and python-vs-javascript.mdx were the
      // same Python-vs-JavaScript-for-beginners comparison under two titles/
      // URLs, cannibalizing each other. python-vs-javascript.mdx is the
      // deeper version (code samples, fuller table); its unique FAQ item was
      // merged in first.
      {
        source: "/blog/best-language-for-beginners",
        destination: "/blog/python-vs-javascript",
        permanent: true,
      },
      // Docker/Git track cleanup: 3 lessons that near-duplicated an earlier
      // lesson's content (found live, unmerged, in a stale worktree from
      // 2026-07-24 that never made it into main). Unique content already
      // folded into the destination lesson before deleting the duplicate.
      {
        source: "/learn/docker/07-dockerfile-deep",
        destination: "/learn/docker/02-dockerfile",
        permanent: true,
      },
      {
        source: "/learn/docker/20-compose-production",
        destination: "/learn/docker/25-production-compose",
        permanent: true,
      },
      {
        source: "/learn/git/12-branching-deep",
        destination: "/learn/git/02-branches",
        permanent: true,
      },
      // Same "-deep" duplicate pattern found by a follow-up scan across all
      // 51 tracks. Unique content (Expanded/Stack, named volumes) folded
      // into the destination lesson before deleting the duplicate.
      {
        source: "/learn/flutter/07-widgets-deep",
        destination: "/learn/flutter/02-widgets",
        permanent: true,
      },
      {
        source: "/learn/flutter/09-layout-deep",
        destination: "/learn/flutter/03-layout",
        permanent: true,
      },
      {
        source: "/learn/docker/13-compose-deep",
        destination: "/learn/docker/03-compose",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

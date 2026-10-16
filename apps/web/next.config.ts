import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";
import type { NextConfig } from "next";
import lessonMoves from "../../content/data/lesson-moves.json";

// Monorepo root: the content tree (content/) and every workspace package live
// above this app. Tracing from the root keeps their files in the deployment.
const monorepoRoot = path.join(__dirname, "../..");

// .env files: Next reads them from this app's folder (apps/web) only. V1 kept
// them at the repository root, and the database scripts (packages/db, run from
// the root) still read them there — so the root files are loaded too, in
// Next's priority order. Anything already set wins and is never overwritten:
// apps/web/.env*, the shell, Vercel's environment variables.
const envMode = process.env.NODE_ENV === "production" ? "production" : "development";
for (const file of [`.env.${envMode}.local`, ".env.local", `.env.${envMode}`, ".env"]) {
  const envPath = path.join(monorepoRoot, file);
  if (!fs.existsSync(envPath)) continue;
  for (const [key, value] of Object.entries(parseEnv(fs.readFileSync(envPath, "utf8")))) {
    process.env[key] ??= value;
  }
}

const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://cdn.jsdelivr.net https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "connect-src 'self' https://cdn.jsdelivr.net https://*.google-analytics.com https://*.analytics.google.com https://vitals.vercel-insights.com",
  "report-uri /api/csp-report",
  "report-to csp-endpoint",
].join("; ");

const nextConfig: NextConfig = {
  // V2 monorepo: see docs/v2/ARCHITECTURE.md §Deployment.
  outputFileTracingRoot: monorepoRoot,
  turbopack: { root: monorepoRoot },
  // Content is read from disk at request time through @tcf/content/paths,
  // which static analysis cannot follow — include the trees explicitly.
  outputFileTracingIncludes: {
    "/*": ["../../content/ar/**/*", "../../content/data/**/*"],
  },
  // Baseline headers plus a non-blocking CSP observation policy. The report is
  // collected before any move to an enforcing policy; see the Phase 0 audit.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
          { key: "Reporting-Endpoints", value: 'csp-endpoint="/api/csp-report"' },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
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
      // Same duplicate pattern found in a "*-advanced.mdx" sweep across all
      // 51 tracks: identical ls -l/chmod-numeric explanation as the base
      // lesson. chmod-by-symbols and chown (its only unique content) folded
      // into 02-permissions.mdx before deleting.
      {
        source: "/learn/linux/07-permissions-advanced",
        destination: "/learn/linux/02-permissions",
        permanent: true,
      },
      // Search Console (2026-10-16) listed these 31 URLs as live 404s with no
      // redirect. Two causes: a track's "summary" lesson was renumbered as the
      // track grew (24-summary → 29-summary …), and the language-agnostic OOP
      // basics were removed on 2026-07-17 when the track became Design
      // Patterns (their closest equivalents today are the Java OOP lessons).
      // check:lesson-redirects now fails CI when a published lesson moves
      // without one of these.
      ...lessonMoves.moves.map((m) => ({ source: m.from, destination: m.to, permanent: true })),
      { source: "/home", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;

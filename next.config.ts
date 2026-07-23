import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security headers applied to every response. CSP uses a SHA-256 hash for
  // the inline theme script (src/app/layout.tsx) so pages remain statically
  // rendered. 'unsafe-eval' is required by the playground (Monaco editor +
  // user code execution). Vercel Analytics domains are allowed for the
  // opt-in analytics layer.
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
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'sha256-aA0i/pd0j86YG0QPyEjVdFPbDzMPfF4UIHiuMe7Jz6U=' 'unsafe-eval' https://va.vercel-scripts.com https://cdn.vercel-insights.com https://vercel.live",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "connect-src 'self' https://vitals.vercel-insights.com https://cdn.vercel-insights.com",
              "worker-src 'self' blob:",
              "frame-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
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
    ];
  },
};

export default nextConfig;

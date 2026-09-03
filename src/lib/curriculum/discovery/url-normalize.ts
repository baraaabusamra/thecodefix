// Phase 3.5B-6B-1 source dedup: a deliberately conservative, deterministic
// normalization used ONLY to compute pipelineSources.normalizedUrl (the
// dedup identity column). The original `url` column is always stored and
// used unchanged for everything else (display, SSRF validation, the actual
// fetch) — this function never touches request authorization, only source
// identity.
//
// What it does: lowercase scheme + hostname, drop the fragment, drop a
// default port (80 for http, 443 for https), collapse exactly one trailing
// slash on a non-root path.
//
// What it deliberately does NOT do (per the Phase 3.5B-6A/6B-1 audits):
//   - strip or reorder query parameters — live data proves they can be the
//     ONLY thing distinguishing two different documents (e.g.
//     ?DeptName=Computer+Science vs ?DeptName=Electrical+Engineering, or a
//     versioned ?v=2025 vs ?v=2026)
//   - merge "www." with the bare host, or "http" with "https" — no live
//     evidence either is always safe, and both are one-directional/lossy
//     to merge
//   - lowercase the path or query — several real paths are legitimately
//     case-sensitive on some servers
export function normalizeSourceUrl(rawUrl: string): string {
  const parsed = new URL(rawUrl);

  const scheme = parsed.protocol.toLowerCase(); // includes trailing ":"
  const hostname = parsed.hostname.toLowerCase();

  const isDefaultPort =
    (scheme === "http:" && parsed.port === "80") ||
    (scheme === "https:" && parsed.port === "443");
  const host = parsed.port && !isDefaultPort ? `${hostname}:${parsed.port}` : hostname;

  let path = parsed.pathname;
  if (path.length > 1 && path.endsWith("/")) {
    path = path.slice(0, -1);
  }

  // parsed.search already includes the leading "?" when present, and is
  // left byte-for-byte unchanged. parsed.hash (the fragment) is
  // deliberately omitted.
  return `${scheme}//${host}${path}${parsed.search}`;
}

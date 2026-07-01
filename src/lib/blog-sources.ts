import { TRACK_RESOURCES, type TrackResource } from "@/lib/track-resources";

// Blog posts (mostly "X vs Y" comparisons and error explainers) carry no
// outbound links. We infer 1–2 authoritative official references per post from
// its slug tokens so every article ships at least one external DoFollow link
// (SEO "external resource" signal + E-E-A-T) without editing 26 files by hand.

// Map slug tokens that aren't themselves track slugs onto the right doc.
const ALIAS: Record<string, string> = {
  github: "git",
  node: "nodejs",
  npm: "nodejs",
  nosql: "mongodb",
  flexbox: "css",
  grid: "css",
  cors: "networking",
  undefined: "javascript",
  properties: "javascript",
  let: "javascript",
  var: "javascript",
  const: "javascript",
  js: "javascript",
  ts: "typescript",
};

// Curated fallback for generic posts (no specific tech in the slug), e.g.
// "how-to-learn-programming", "best-language-for-beginners".
const GENERIC_FALLBACK: TrackResource = {
  label: "freeCodeCamp — مصدر تعلّم البرمجة",
  url: "https://www.freecodecamp.org/",
};

export function getPostSources(slug: string, limit = 2): TrackResource[] {
  const tokens = slug.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const seen = new Set<string>();
  const out: TrackResource[] = [];
  for (const tok of tokens) {
    const key = ALIAS[tok] ?? tok;
    const res = TRACK_RESOURCES[key];
    if (res && !seen.has(key)) {
      seen.add(key);
      out.push(res);
      if (out.length >= limit) break;
    }
  }
  return out.length ? out : [GENERIC_FALLBACK];
}

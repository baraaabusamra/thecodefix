import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { contentDir } from "./paths";

const BLOG_DIR = contentDir("blog");

export type FaqItem = { q: string; a: string };
export type HowToStep = { name: string; text: string };
export type HowToSpec = { name: string; steps: HowToStep[] };

export type PostFrontmatter = {
  title: string;
  // Optional keyword-first override for the <title> tag (leaves the visible H1
  // as `title`). Used on error/how-to posts whose natural headline starts with
  // "حل خطأ ..." so the focus keyword still leads the SEO title.
  seoTitle?: string;
  description: string;
  date: string; // ISO yyyy-mm-dd — published date
  updated?: string; // ISO yyyy-mm-dd — last-updated date (E-E-A-T freshness)
  tldr?: string; // optional "باختصار" summary rendered in a box at the top
  keywords?: string[];
  faq?: FaqItem[]; // optional Q&A, rendered visibly + as FAQPage JSON-LD
  // Optional fix-sequence for troubleshooting posts — JSON-LD HowTo only (no
  // separate visible section) since the steps already exist in the article's
  // prose/headings; this just restates the real sequence in structured form.
  howTo?: HowToSpec;
};

export type PostSummary = { slug: string } & PostFrontmatter;
export type Post = PostSummary & { content: string };

export function getPosts(): PostSummary[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(BLOG_DIR, file), "utf-8");
      const { data } = matter(raw);
      return { slug: file.replace(/\.mdx$/, ""), ...(data as PostFrontmatter) };
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1)); // newest first
}

export function getPost(slug: string): Post | null {
  const file = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf-8");
  const { data, content } = matter(raw);
  return { slug, content, ...(data as PostFrontmatter) };
}

// Normalize a string to comparable tokens (handles Arabic + latin, drops noise).
function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, " ").trim();
}

// Related posts for internal linking: rank other posts by shared keywords
// (weight 3) then shared title tokens (weight 1), tie-break by recency. Always
// fills up to `limit` so every post links onward into the cluster.
export function getRelatedPosts(slug: string, limit = 4): PostSummary[] {
  const all = getPosts();
  const current = all.find((p) => p.slug === slug);
  if (!current) return [];
  const curKw = new Set((current.keywords ?? []).map(norm));
  const curTokens = new Set(norm(current.title).split(" ").filter((t) => t.length > 2));
  return all
    .filter((p) => p.slug !== slug)
    .map((p) => {
      let score = 0;
      for (const k of p.keywords ?? []) if (curKw.has(norm(k))) score += 3;
      for (const t of norm(p.title).split(" ")) if (t.length > 2 && curTokens.has(t)) score += 1;
      return { p, score };
    })
    .sort((a, b) => b.score - a.score || (a.p.date < b.p.date ? 1 : -1))
    .slice(0, limit)
    .map((s) => s.p);
}

// Posts that mention a given track, for the /learn/<tech> pillar page.
// Token-equality match (via norm) so "java" never pulls "javascript" posts;
// both the latin slug and the Arabic track title are tried as needles.
export function getPostsForTrack(
  techSlug: string,
  trackTitle: string,
  limit = 4
): PostSummary[] {
  const needles = new Set(
    [...norm(techSlug).split(" "), ...norm(trackTitle).split(" ")].filter(Boolean)
  );
  if (needles.size === 0) return [];
  return getPosts()
    .map((p) => {
      let score = 0;
      for (const t of norm(p.title).split(" ")) if (needles.has(t)) score += 2;
      for (const k of p.keywords ?? [])
        for (const t of norm(k).split(" ")) if (needles.has(t)) score += 1;
      return { p, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score || (a.p.date < b.p.date ? 1 : -1))
    .slice(0, limit)
    .map((s) => s.p);
}

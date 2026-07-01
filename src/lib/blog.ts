import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "src", "content", "blog");

export type FaqItem = { q: string; a: string };

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

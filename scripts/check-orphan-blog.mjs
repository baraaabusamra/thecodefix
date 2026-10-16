import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const blogDir = path.join(process.cwd(), "content", "ar", "blog");
const norm = (s) => s.toLowerCase().trim();

const posts = fs.readdirSync(blogDir)
  .filter((f) => f.endsWith(".mdx"))
  .map((f) => {
    const { data } = matter(fs.readFileSync(path.join(blogDir, f), "utf8"));
    return { slug: f.replace(/\.mdx$/, ""), title: data.title || "", keywords: data.keywords || [] };
  });

// Reproduce getRelatedPosts() from packages/content/src/blog.ts exactly.
function getRelatedSlugs(current, limit = 4) {
  const curKw = new Set(current.keywords.map(norm));
  const curTokens = new Set(norm(current.title).split(" ").filter((t) => t.length > 2));
  return posts
    .filter((p) => p.slug !== current.slug)
    .map((p) => {
      let score = 0;
      for (const k of p.keywords) if (curKw.has(norm(k))) score += 3;
      for (const t of norm(p.title).split(" ")) if (t.length > 2 && curTokens.has(t)) score += 1;
      return { slug: p.slug, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .filter((s) => s.score > 0)
    .map((s) => s.slug);
}

// Manual prose links to /blog/* from ANYWHERE in content -- both other blog
// posts and lesson files (a lesson linking out to a troubleshooting post is
// exactly as valid an inbound link as another post doing it).
function walkMdx(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkMdx(p, out);
    else if (entry.name.endsWith(".mdx")) out.push(p);
  }
  return out;
}
const tracksDir = path.join(process.cwd(), "content", "ar", "tracks");
const manualLinked = new Set();
const linkPattern = /\]\(\/blog\/([^)\s#?]+)/g;
for (const file of [...walkMdx(blogDir), ...walkMdx(tracksDir)]) {
  const content = fs.readFileSync(file, "utf8");
  let m;
  while ((m = linkPattern.exec(content))) manualLinked.add(m[1].replace(/\/$/, ""));
}

const autoLinked = new Set();
for (const p of posts) {
  for (const slug of getRelatedSlugs(p)) autoLinked.add(slug);
}

const trueOrphans = posts.filter((p) => !manualLinked.has(p.slug) && !autoLinked.has(p.slug));

console.log(`Total posts: ${posts.length}`);
console.log(`Reachable via manual link: ${manualLinked.size}`);
console.log(`Reachable via auto related-posts widget (score > 0 in someone's top 4): ${autoLinked.size}`);
console.log(`\nTRUE orphans (neither manual nor auto-related link from any other post): ${trueOrphans.length}`);
for (const p of trueOrphans) console.log(`  /blog/${p.slug} -- keywords: ${p.keywords.join(", ")}`);
if (trueOrphans.length > 0) process.exit(1);

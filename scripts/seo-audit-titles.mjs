import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const contentRoot = path.join(process.cwd(), "content", "ar"); // V2: per-locale content tree
const SUFFIX = " | The Code Fix"; // 15 chars, appended unless the page uses an absolute title

// Lessons prefer "<trackTitle> بالعربي: <lessonTitle>". When that exceeds the
// SERP limit, page metadata falls back to the clean lesson title; exceptionally
// long lesson titles provide an explicit seoTitle.
const tracksDir = path.join(contentRoot, "tracks");
let lessonOver = 0, lessonTotal = 0;
const lessonLens = [];
for (const track of fs.readdirSync(tracksDir)) {
  const trackDir = path.join(tracksDir, track);
  if (!fs.statSync(trackDir).isDirectory()) continue;
  const metaPath = path.join(trackDir, "_meta.json");
  if (!fs.existsSync(metaPath)) continue;
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
  const trackTitle = meta.title || "";
  for (const f of fs.readdirSync(trackDir)) {
    if (!f.endsWith(".mdx")) continue;
    const { data } = matter(fs.readFileSync(path.join(trackDir, f), "utf8"));
    const qualifiedTitle = trackTitle ? `${trackTitle} بالعربي: ${data.title}` : `${data.title} بالعربي`;
    const seoTitle = data.seoTitle || (qualifiedTitle.length <= 60 ? qualifiedTitle : data.title);
    lessonLens.push(seoTitle.length);
    lessonTotal++;
    if (seoTitle.length > 60) {
      lessonOver++;
      console.log(`LESSON TITLE OVER 60 (${seoTitle.length}): ${track}/${f} -- "${seoTitle}"`);
    }
  }
}

// Blog: real <title> = post.seoTitle (absolute) if set, else post.title + SUFFIX
const blogDir = path.join(contentRoot, "blog");
let blogOver = 0, blogTotal = 0;
const blogLens = [];
for (const f of fs.readdirSync(blogDir)) {
  if (!f.endsWith(".mdx")) continue;
  const { data } = matter(fs.readFileSync(path.join(blogDir, f), "utf8"));
  const real = data.seoTitle ? data.seoTitle : `${data.title}${SUFFIX}`;
  blogLens.push(real.length);
  blogTotal++;
  if (real.length > 60) { blogOver++; console.log(`BLOG TITLE OVER 60 (${real.length}): ${f} -- "${real}"`); }
}

const avg = (arr) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(0);
console.log(`\n=== Real rendered <title> lengths ===`);
console.log(`Lessons: avg ${avg(lessonLens)} chars, ${lessonOver}/${lessonTotal} over 60 (${((lessonOver/lessonTotal)*100).toFixed(1)}%)`);
console.log(`Blog:    avg ${avg(blogLens)} chars, ${blogOver}/${blogTotal} over 60 (${((blogOver/blogTotal)*100).toFixed(1)}%)`);

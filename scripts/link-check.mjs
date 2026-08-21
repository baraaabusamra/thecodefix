import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "src", "content");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith(".mdx") || entry.name.endsWith(".json")) out.push(p);
  }
  return out;
}

const files = walk(ROOT);

// Build the set of real /learn/<track>/<lesson> and /reference/<section>/<slug> paths.
const tracksDir = path.join(ROOT, "tracks");
const validLessonPaths = new Set();
for (const track of fs.readdirSync(tracksDir)) {
  const trackDir = path.join(tracksDir, track);
  if (!fs.statSync(trackDir).isDirectory()) continue;
  validLessonPaths.add(`/learn/${track}`);
  for (const f of fs.readdirSync(trackDir)) {
    if (f.endsWith(".mdx")) {
      validLessonPaths.add(`/learn/${track}/${f.replace(/\.mdx$/, "")}`);
    }
  }
}

const refDir = path.join(ROOT, "reference");
const validRefPaths = new Set(["/reference"]);
for (const f of fs.readdirSync(refDir)) {
  if (!f.endsWith(".json")) continue;
  const section = f.replace(/\.json$/, "");
  validRefPaths.add(`/reference/${section}`);
  const entries = JSON.parse(fs.readFileSync(path.join(refDir, f), "utf8"));
  for (const e of entries) validRefPaths.add(`/reference/${section}/${e.slug}`);
}

const blogDir = path.join(ROOT, "blog");
const validBlogPaths = new Set(["/blog"]);
for (const f of fs.readdirSync(blogDir)) {
  if (f.endsWith(".mdx")) validBlogPaths.add(`/blog/${f.replace(/\.mdx$/, "")}`);
}

const linkPattern = /\]\((\/(?:learn|reference|blog)\/[^)\s]+)\)/g;
const broken = [];

for (const file of files) {
  const content = fs.readFileSync(file, "utf8");
  let m;
  while ((m = linkPattern.exec(content))) {
    let href = m[1].split("#")[0].split("?")[0];
    href = href.replace(/\/$/, "");
    const isLearn = href.startsWith("/learn/");
    const isRef = href.startsWith("/reference/");
    const isBlog = href.startsWith("/blog/");
    const valid =
      (isLearn && validLessonPaths.has(href)) ||
      (isRef && validRefPaths.has(href)) ||
      (isBlog && validBlogPaths.has(href));
    if (!valid) {
      broken.push({ file: path.relative(process.cwd(), file), href });
    }
  }
}

console.log(`Scanned ${files.length} content files.`);
console.log(`Found ${broken.length} broken internal link(s):\n`);
for (const b of broken) {
  console.log(`${b.file} -> ${b.href}`);
}

if (broken.length > 0) process.exit(1);

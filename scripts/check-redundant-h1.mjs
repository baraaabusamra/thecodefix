import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const tracksDir = path.join(process.cwd(), "content", "ar", "tracks");
let found = 0;

for (const track of fs.readdirSync(tracksDir)) {
  const trackDir = path.join(tracksDir, track);
  if (!fs.statSync(trackDir).isDirectory()) continue;

  for (const f of fs.readdirSync(trackDir)) {
    if (!f.endsWith(".mdx")) continue;
    const raw = fs.readFileSync(path.join(trackDir, f), "utf8");
    const { content } = matter(raw);
    const firstNonEmptyLine = content.split("\n").find((l) => l.trim() !== "");
    if (firstNonEmptyLine && /^#\s/.test(firstNonEmptyLine)) {
      console.log(`${track}/${f}: body opens with an H1 ("${firstNonEmptyLine.trim()}") -- duplicates the page's own <h1>{title}</h1>`);
      found++;
    }
  }
}

console.log(`\nTotal: ${found}`);
if (found > 0) process.exit(1);

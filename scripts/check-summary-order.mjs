// Flags any lesson whose title looks like a track "summary/conclusion" but
// whose `order` isn't the highest in its track -- i.e. it would show up (and
// tell the student they're done) before later lessons that were added after
// it. Sorting is entirely order-driven (see src/lib/content.ts), so this is
// a real navigation bug, not cosmetic.
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const tracksDir = path.join(process.cwd(), "src", "content", "tracks");
let found = 0;

for (const track of fs.readdirSync(tracksDir)) {
  const trackDir = path.join(tracksDir, track);
  if (!fs.statSync(trackDir).isDirectory()) continue;

  const lessons = [];
  for (const f of fs.readdirSync(trackDir)) {
    if (!f.endsWith(".mdx")) continue;
    const raw = fs.readFileSync(path.join(trackDir, f), "utf8");
    const { data } = matter(raw);
    lessons.push({ file: f, order: data.order, title: data.title || "" });
  }
  if (lessons.length === 0) continue;

  const maxOrder = Math.max(...lessons.map((l) => l.order));
  const summaryLike = lessons.filter((l) =>
    /خلاصة|ملخص/.test(l.title)
  );

  for (const s of summaryLike) {
    if (s.order !== maxOrder) {
      console.log(`${track}/${s.file} (order ${s.order}, title "${s.title}") is NOT the last lesson (max order in track = ${maxOrder})`);
      found++;
    }
  }
}

if (found > 0) {
  console.log(`\n${found} summary lesson(s) out of order.`);
  process.exit(1);
} else {
  console.log("All summary lessons are correctly ordered last in their track.");
}

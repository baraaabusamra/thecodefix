import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const tracksDir = path.join(process.cwd(), "content", "ar", "tracks");
let missingDesc = 0;
let dupeOrders = 0;

for (const track of fs.readdirSync(tracksDir)) {
  const trackDir = path.join(tracksDir, track);
  if (!fs.statSync(trackDir).isDirectory()) continue;

  const lessons = [];
  for (const f of fs.readdirSync(trackDir)) {
    if (!f.endsWith(".mdx")) continue;
    const raw = fs.readFileSync(path.join(trackDir, f), "utf8");
    const { data } = matter(raw);
    lessons.push({ file: f, order: data.order, title: data.title, description: data.description });
    if (!data.description) {
      console.log(`MISSING DESCRIPTION: ${track}/${f}`);
      missingDesc++;
    }
    if (data.order === undefined || data.order === null) {
      console.log(`MISSING ORDER: ${track}/${f}`);
    }
  }

  const orderCounts = {};
  for (const l of lessons) {
    orderCounts[l.order] = (orderCounts[l.order] || 0) + 1;
  }
  for (const [order, count] of Object.entries(orderCounts)) {
    if (count > 1) {
      const dupes = lessons.filter((l) => String(l.order) === order).map((l) => l.file);
      console.log(`DUPLICATE ORDER ${order} in ${track}: ${dupes.join(", ")}`);
      dupeOrders++;
    }
  }
}

console.log(`\nTotal missing descriptions: ${missingDesc}`);
console.log(`Total duplicate-order groups: ${dupeOrders}`);

if (missingDesc > 0 || dupeOrders > 0) process.exit(1);

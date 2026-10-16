import fs from "node:fs";
import path from "node:path";

const refDir = path.join(process.cwd(), "content", "ar", "reference");
let broken = 0;
let dupeSlug = 0;

for (const f of fs.readdirSync(refDir)) {
  if (!f.endsWith(".json")) continue;
  const section = f.replace(/\.json$/, "");
  const entries = JSON.parse(fs.readFileSync(path.join(refDir, f), "utf8"));
  const slugs = new Set(entries.map((e) => e.slug));

  const seen = new Set();
  for (const e of entries) {
    if (seen.has(e.slug)) {
      console.log(`DUPLICATE SLUG in ${section}: "${e.slug}"`);
      dupeSlug++;
    }
    seen.add(e.slug);

    for (const r of e.related || []) {
      if (!slugs.has(r)) {
        console.log(`${section}/${e.slug}: related[] points to nonexistent "${r}" (silently dropped by getRefEntry)`);
        broken++;
      }
    }
  }
}

console.log(`\nBroken related references: ${broken}`);
console.log(`Duplicate slugs: ${dupeSlug}`);
if (broken > 0 || dupeSlug > 0) process.exit(1);

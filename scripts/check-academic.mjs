import fs from "node:fs";
import path from "node:path";

const uniDir = path.join(process.cwd(), "content", "data", "academic-universities");
let issues = 0;

for (const f of fs.readdirSync(uniDir)) {
  if (!f.endsWith(".json")) continue;
  const country = f.replace(/\.json$/, "");
  const unis = JSON.parse(fs.readFileSync(path.join(uniDir, f), "utf8"));
  const seenSlugs = new Set();

  for (const u of unis) {
    if (!u.slug || !u.name) {
      console.log(`${country}: entry missing slug/name -- ${JSON.stringify(u).slice(0, 80)}`);
      issues++;
      continue;
    }
    if (seenSlugs.has(u.slug)) {
      console.log(`${country}: duplicate university slug "${u.slug}"`);
      issues++;
    }
    seenSlugs.add(u.slug);

    const specs = u.specializations || [];
    const seenSpecs = new Set();
    for (const s of specs) {
      if (seenSpecs.has(s)) {
        console.log(`${country}/${u.slug}: duplicate specialization "${s}"`);
        issues++;
      }
      seenSpecs.add(s);
    }
  }
}

console.log(`\nTotal academic-universities issues: ${issues}`);
if (issues > 0) process.exit(1);

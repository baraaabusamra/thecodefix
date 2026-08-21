import fs from "node:fs";
import path from "node:path";

const refDir = path.join(process.cwd(), "src", "content", "reference");
let found = 0;

for (const f of fs.readdirSync(refDir)) {
  if (!f.endsWith(".json")) continue;
  const section = f.replace(/\.json$/, "");
  const entries = JSON.parse(fs.readFileSync(path.join(refDir, f), "utf8"));

  const keywordOwner = new Map(); // normalized keyword -> slug
  for (const e of entries) {
    for (const kw of e.keywords || []) {
      const norm = kw.trim().toLowerCase();
      if (keywordOwner.has(norm) && keywordOwner.get(norm) !== e.slug) {
        console.log(`${section}: "${kw}" claimed by both "${keywordOwner.get(norm)}" and "${e.slug}"`);
        found++;
      } else {
        keywordOwner.set(norm, e.slug);
      }
    }
  }
}

console.log(`\nTotal exact keyword collisions within a section: ${found}`);

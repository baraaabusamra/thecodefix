import fs from "node:fs";
import path from "node:path";

const refDir = path.join(process.cwd(), "src", "content", "reference");
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

    // `lesson` is a /learn path; the lesson page lists this entry and the
    // entry links back, so a dead path breaks both directions silently.
    if (e.lesson !== undefined) {
      const m = /^\/learn\/([^/]+)\/([^/]+)$/.exec(e.lesson);
      const file = m && path.join(process.cwd(), "src", "content", "tracks", m[1], `${m[2]}.mdx`);
      if (!file || !fs.existsSync(file)) {
        console.log(`${section}/${e.slug}: lesson "${e.lesson}" is not a lesson`);
        broken++;
      }
    }
    if (e.noindex && !e.lesson) {
      console.log(`${section}/${e.slug}: noindex without a lesson — nothing would rank for this topic`);
      broken++;
    }

    for (const r of e.related || []) {
      if (!slugs.has(r)) {
        console.log(`${section}/${e.slug}: related[] points to nonexistent "${r}" (silently dropped by getRefEntry)`);
        broken++;
      }
    }
  }
}

// reference-moves.json: merged entries → 301 to their lesson. The target must
// be a lesson, and the source must not still be a live entry (the redirect
// would hide it).
const movesFile = path.join(process.cwd(), "src", "content", "reference-moves.json");
if (fs.existsSync(movesFile)) {
  for (const { from, to } of JSON.parse(fs.readFileSync(movesFile, "utf8")).moves) {
    const m = /^\/learn\/([^/]+)\/([^/]+)$/.exec(to);
    if (!m || !fs.existsSync(path.join(process.cwd(), "src", "content", "tracks", m[1], `${m[2]}.mdx`))) {
      console.log(`reference-moves: ${from} → ${to}, but ${to} is not a lesson`);
      broken++;
    }
    const [, , section, slug] = from.split("/");
    const file = path.join(refDir, `${section}.json`);
    if (fs.existsSync(file) && JSON.parse(fs.readFileSync(file, "utf8")).some((e) => e.slug === slug)) {
      console.log(`reference-moves: ${from} is still a live entry — its redirect would hide it`);
      broken++;
    }
  }
}

console.log(`\nBroken related references: ${broken}`);
console.log(`Duplicate slugs: ${dupeSlug}`);
if (broken > 0 || dupeSlug > 0) process.exit(1);

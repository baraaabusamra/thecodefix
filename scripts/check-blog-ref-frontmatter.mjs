import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const blogDir = path.join(process.cwd(), "src", "content", "blog");
let issues = 0;

for (const f of fs.readdirSync(blogDir)) {
  if (!f.endsWith(".mdx")) continue;
  const raw = fs.readFileSync(path.join(blogDir, f), "utf8");
  const { data } = matter(raw);
  const missing = ["title", "description", "date", "keywords"].filter((k) => !data[k]);
  if (missing.length > 0) {
    console.log(`blog/${f}: missing ${missing.join(", ")}`);
    issues++;
  }
}

const refDir = path.join(process.cwd(), "src", "content", "reference");
for (const f of fs.readdirSync(refDir)) {
  if (!f.endsWith(".json")) continue;
  const entries = JSON.parse(fs.readFileSync(path.join(refDir, f), "utf8"));
  for (const e of entries) {
    const missing = ["slug", "name", "title", "summary", "description"].filter((k) => !e[k]);
    if (missing.length > 0) {
      console.log(`reference/${f} (${e.slug || "?"}): missing ${missing.join(", ")}`);
      issues++;
    }
  }
}

console.log(`\nTotal issues: ${issues}`);
if (issues > 0) process.exit(1);

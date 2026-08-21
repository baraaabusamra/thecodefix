import fs from "node:fs";
import path from "node:path";

const dir = path.join(process.cwd(), "src", "content", "academic");
const tracksDir = path.join(process.cwd(), "src", "content", "tracks");
const realTracks = new Set(
  fs.readdirSync(tracksDir).filter((f) => fs.statSync(path.join(tracksDir, f)).isDirectory())
);

let issues = 0;
for (const f of fs.readdirSync(dir)) {
  if (!f.endsWith(".json")) continue;
  const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  if (!data.description) {
    console.log(`${f}: missing top-level description`);
    issues++;
  }
  for (const topic of data.topics || []) {
    if (!realTracks.has(topic.track)) {
      console.log(`${f}: topic "${topic.title}" references nonexistent track "${topic.track}"`);
      issues++;
    }
  }
}

console.log(`\nTotal academic-course issues: ${issues}`);
if (issues > 0) process.exit(1);

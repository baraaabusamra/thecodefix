import fs from "node:fs";
import path from "node:path";

const roadmapDir = path.join(process.cwd(), "content", "ar", "roadmaps");
const tracksDir = path.join(process.cwd(), "content", "ar", "tracks");
const realTracks = new Set(
  fs.readdirSync(tracksDir).filter((f) => fs.statSync(path.join(tracksDir, f)).isDirectory())
);

let issues = 0;
for (const f of fs.readdirSync(roadmapDir)) {
  if (!f.endsWith(".json")) continue;
  const data = JSON.parse(fs.readFileSync(path.join(roadmapDir, f), "utf8"));
  for (const step of data.steps || []) {
    if (!realTracks.has(step.track)) {
      console.log(`${f}: step "${step.title}" references nonexistent track "${step.track}"`);
      issues++;
    }
  }
}

console.log(`\nTotal roadmap issues: ${issues}`);
if (issues > 0) process.exit(1);

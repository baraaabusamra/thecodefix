import fs from "node:fs";
import path from "node:path";

const ROADMAPS_DIR = path.join(process.cwd(), "src", "content", "roadmaps");

export type RoadmapStep = {
  track: string; // track slug to link to (/learn/<track>)
  title: string;
  why: string; // detailed justification — why this step, what it solves
  concepts: string[]; // core topics to master in this stage
  prerequisites: string; // what to know before starting
  realWorld: string; // how the skill is used in real projects / jobs
  optional?: boolean;
};

export type Roadmap = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  intro: string;
  steps: RoadmapStep[];
};

export function getRoadmaps(): Roadmap[] {
  if (!fs.existsSync(ROADMAPS_DIR)) return [];
  return fs
    .readdirSync(ROADMAPS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(ROADMAPS_DIR, file), "utf-8");
      return {
        slug: file.replace(/\.json$/, ""),
        order: 0,
        ...JSON.parse(raw),
      } as Roadmap;
    })
    .sort((a, b) => a.order - b.order);
}

export function getRoadmap(slug: string): Roadmap | null {
  const file = path.join(ROADMAPS_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return {
    slug,
    order: 0,
    ...JSON.parse(fs.readFileSync(file, "utf-8")),
  } as Roadmap;
}

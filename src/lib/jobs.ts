import fs from "node:fs";
import path from "node:path";

const JOBS_DIR = path.join(process.cwd(), "src", "content", "jobs");

export type Job = {
  slug: string;
  title: string;
  company: string;
  location: string;
  country?: string; // ISO 3166-1 alpha-2, only set when location names one real country
  remote: boolean;
  type: string; // دوام كامل / جزئي / تدريب
  salary?: string;
  tags: string[];
  description: string;
  requirements: string[];
  applyUrl: string; // mailto: or https:
  postedDate: string; // yyyy-mm-dd
};

export function getJobs(): Job[] {
  if (!fs.existsSync(JOBS_DIR)) return [];
  return fs
    .readdirSync(JOBS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(JOBS_DIR, file), "utf-8");
      return { slug: file.replace(/\.json$/, ""), ...JSON.parse(raw) } as Job;
    })
    .sort((a, b) => (a.postedDate < b.postedDate ? 1 : -1)); // newest first
}

export function getJob(slug: string): Job | null {
  const file = path.join(JOBS_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, "utf-8");
  return { slug, ...JSON.parse(raw) } as Job;
}

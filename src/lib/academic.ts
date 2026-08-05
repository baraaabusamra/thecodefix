import fs from "node:fs";
import path from "node:path";

const ACADEMIC_DIR = path.join(process.cwd(), "src", "content", "academic");

// Same shape as a Roadmap step (see lib/roadmaps.ts), reused here because a
// university course and a career roadmap are the same underlying model — an
// ordered set of real track topics with justification. Kept as its own
// content folder/route (not merged into /roadmaps) since the framing and
// audience are different: "study companion for course X" vs "become a Y".
export type AcademicTopic = {
  track: string; // track slug to link to (/learn/<track>)
  title: string;
  why: string;
  concepts: string[];
  prerequisites: string;
  realWorld: string;
  optional?: boolean;
};

export type AcademicCourse = {
  slug: string;
  title: string; // the university course name, as commonly taught
  description: string;
  icon: string;
  color: string;
  order: number;
  intro: string;
  topics: AcademicTopic[];
};

export function getAcademicCourses(): AcademicCourse[] {
  if (!fs.existsSync(ACADEMIC_DIR)) return [];
  return fs
    .readdirSync(ACADEMIC_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((file) => {
      const raw = fs.readFileSync(path.join(ACADEMIC_DIR, file), "utf-8");
      return {
        slug: file.replace(/\.json$/, ""),
        order: 0,
        ...JSON.parse(raw),
      } as AcademicCourse;
    })
    .sort((a, b) => a.order - b.order);
}

export function getAcademicCourse(slug: string): AcademicCourse | null {
  const file = path.join(ACADEMIC_DIR, `${slug}.json`);
  if (!fs.existsSync(file)) return null;
  return {
    slug,
    order: 0,
    ...JSON.parse(fs.readFileSync(file, "utf-8")),
  } as AcademicCourse;
}

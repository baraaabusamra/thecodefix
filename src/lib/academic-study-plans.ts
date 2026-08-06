import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "src", "content", "academic-study-plans");

// A real, sourced curriculum (course numbers, credit hours, prerequisites) for
// one university + specialization combo — distinct from the generic
// SPECIALIZATIONS list in academic-universities.ts, which is a shared category
// description used across every university. Populated only where we have an
// actual official document to transcribe from (see source/sourceDate below);
// most university+specialization combos won't have a file here.
export type StudyPlanCourse = {
  number: string;
  name: string;
  creditHours: number;
  theoretical: number;
  practical: number;
  prerequisite?: string;
  mode?: string;
};

export type StudyPlanCategory = {
  name: string;
  creditHours: number;
  note?: string;
  courses: StudyPlanCourse[];
};

export type StudyPlan = {
  programNameEn: string;
  degree: string;
  totalCreditHours: number;
  source: string;
  sourceDate: string;
  categories: StudyPlanCategory[];
};

export function getStudyPlan(
  country: string,
  university: string,
  specialization: string
): StudyPlan | null {
  const file = path.join(DIR, country, university, `${specialization}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf-8")) as StudyPlan;
}

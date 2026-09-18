import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { db } from "@/db";
import { academicStudyPlans } from "@/db/schema";
import { eq, and } from "drizzle-orm";

const DIR = path.join(process.cwd(), "src", "content", "academic-study-plans");

// A real, sourced curriculum (course numbers, credit hours, prerequisites) for
// one university + specialization combo — distinct from the generic
// SPECIALIZATIONS list in academic-universities.ts, which is a shared category
// description used across every university. Lives in two places that are
// merged transparently, mirroring src/lib/content.ts:
//  - Files: src/content/academic-study-plans/<country>/<university>/<spec>.json
//    (transcribed by hand from an official document; read-only, reviewed)
//  - Database: authored from the admin panel (/admin/academic); editable in
//    production, no code required.
// A file entry always wins over a DB row for the same combo.
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
  generalNote?: string;
  categories: StudyPlanCategory[];
  origin: "file" | "db";
  // Editorial status of a DB-backed plan (file plans are always published).
  status?: "draft" | "review" | "published" | "suspended";
  // Real last-content-change timestamp — file mtime for a file-backed plan,
  // the row's own `updatedAt` for a DB-backed one. Used by the sitemap's
  // `lastModified` (must reflect an actual data change, never "now") — see
  // src/lib/academic-indexability.ts and src/app/sitemap.ts.
  updatedAt: Date;
};

function fileStudyPlan(
  country: string,
  university: string,
  specialization: string
): StudyPlan | null {
  const file = path.join(DIR, country, university, `${specialization}.json`);
  if (!fs.existsSync(file)) return null;
  const parsed = JSON.parse(fs.readFileSync(file, "utf-8"));
  const { mtime } = fs.statSync(file);
  return { ...parsed, origin: "file", updatedAt: mtime };
}

// Public readers only ever see PUBLISHED rows (drafts/reviews/suspended plans
// are invisible to pages, the sitemap and generateStaticParams).
const dbStudyPlans = cache(async () => {
  if (!db) return [];
  return db.select().from(academicStudyPlans).where(eq(academicStudyPlans.status, "published"));
});

// Admin editor only: every row regardless of status.
const allDbStudyPlans = cache(async () => {
  if (!db) return [];
  return db.select().from(academicStudyPlans);
});

function rowToPlan(row: {
  programNameEn: string;
  degree: string;
  totalCreditHours: number;
  source: string;
  sourceDate: string;
  generalNote: string | null;
  categories: string;
  updatedAt: Date;
  status: StudyPlan["status"];
}): StudyPlan {
  return {
    programNameEn: row.programNameEn,
    degree: row.degree,
    totalCreditHours: row.totalCreditHours,
    source: row.source,
    sourceDate: row.sourceDate,
    generalNote: row.generalNote ?? undefined,
    categories: JSON.parse(row.categories) as StudyPlanCategory[],
    origin: "db",
    status: row.status,
    updatedAt: row.updatedAt,
  };
}

export async function getStudyPlan(
  country: string,
  university: string,
  specialization: string,
  options: { includeUnpublished?: boolean } = {}
): Promise<StudyPlan | null> {
  const fromFile = fileStudyPlan(country, university, specialization);
  if (fromFile) return fromFile;

  const rows = options.includeUnpublished ? await allDbStudyPlans() : await dbStudyPlans();
  const row = rows.find(
    (r) =>
      r.country === country &&
      r.university === university &&
      r.specialization === specialization
  );
  return row ? rowToPlan(row) : null;
}

/** Every combo that has a study plan (file or DB) — used by generateStaticParams. */
export async function getStudyPlanKeys(): Promise<
  { country: string; university: string; specialization: string }[]
> {
  const keys: { country: string; university: string; specialization: string }[] = [];
  if (fs.existsSync(DIR)) {
    for (const country of fs.readdirSync(DIR)) {
      const countryDir = path.join(DIR, country);
      if (!fs.statSync(countryDir).isDirectory()) continue;
      for (const university of fs.readdirSync(countryDir)) {
        const uniDir = path.join(countryDir, university);
        if (!fs.statSync(uniDir).isDirectory()) continue;
        for (const f of fs.readdirSync(uniDir)) {
          if (f.endsWith(".json")) {
            keys.push({ country, university, specialization: f.replace(/\.json$/, "") });
          }
        }
      }
    }
  }
  for (const row of await dbStudyPlans()) {
    if (
      !keys.some(
        (k) =>
          k.country === row.country &&
          k.university === row.university &&
          k.specialization === row.specialization
      )
    ) {
      keys.push({
        country: row.country,
        university: row.university,
        specialization: row.specialization,
      });
    }
  }
  return keys;
}

/** Look up a course by number across every study plan (file + DB) for one university. */
export type CourseOccurrence = { specialization: string; category: string };
export type UniversityCourse = { course: StudyPlanCourse; occurrences: CourseOccurrence[] };

/** Every course taught at a university, across all its specializations' study plans (file + DB). */
export async function listUniversityCourses(
  country: string,
  university: string
): Promise<Map<string, UniversityCourse>> {
  const map = new Map<string, UniversityCourse>();
  const keys = (await getStudyPlanKeys()).filter(
    (k) => k.country === country && k.university === university
  );
  for (const k of keys) {
    const plan = await getStudyPlan(k.country, k.university, k.specialization);
    if (!plan) continue;
    for (const cat of plan.categories) {
      for (const c of cat.courses) {
        const entry = map.get(c.number) ?? { course: c, occurrences: [] };
        entry.occurrences.push({ specialization: k.specialization, category: cat.name });
        map.set(c.number, entry);
      }
    }
  }
  return map;
}

export async function findCourseInUniversity(
  country: string,
  university: string,
  courseNumber: string
): Promise<UniversityCourse | null> {
  const map = await listUniversityCourses(country, university);
  return map.get(courseNumber) ?? null;
}

// ── Admin-side (includes ids, unfiltered) ──────────────────────────────
export async function listDbStudyPlans() {
  if (!db) return [];
  return db.select().from(academicStudyPlans);
}

export async function getDbStudyPlanByKey(
  country: string,
  university: string,
  specialization: string
) {
  if (!db) return null;
  const rows = await db
    .select()
    .from(academicStudyPlans)
    .where(
      and(
        eq(academicStudyPlans.country, country),
        eq(academicStudyPlans.university, university),
        eq(academicStudyPlans.specialization, specialization)
      )
    )
    .limit(1);
  return rows[0] ?? null;
}

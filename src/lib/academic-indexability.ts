import { getCountry, type Country } from "@/lib/job-search";
import {
  getUniversity,
  getSpecialization,
  type University,
  type Specialization,
} from "@/lib/academic-universities";
import { getStudyPlan, type StudyPlan } from "@/lib/academic-study-plans";

// Single source of truth for whether a /academic/[country]/[university]/
// [specialization] page is (a) a real route at all and (b) allowed to be
// indexed. Used identically by the page component, generateMetadata, and
// the sitemap generator — see reports/seo-spam-audit-2026-08-28/RF-01 and
// phase-1-remediation-result.md for why this exists: 1038 of these pages
// were found rendering an identical generic course list differing only by
// the university name, because indexability was never gated on real,
// sourced content actually existing.

export type AcademicRoute = {
  country: Country;
  university: University;
  specialization: Specialization;
};

/**
 * Route validity only — country exists, university exists and belongs to
 * that country (guaranteed by construction: getUniversity reads
 * src/content/academic-universities/<country>.json, so a university from a
 * different country's file can never match), and the specialization is a
 * real, known specialization genuinely offered by that university.
 * Pure / synchronous — reads only the checked-in JSON content files, no DB.
 */
export function resolveAcademicRoute(
  countrySlug: string,
  universitySlug: string,
  specializationSlug: string
): AcademicRoute | null {
  const country = getCountry(countrySlug);
  const university = getUniversity(countrySlug, universitySlug);
  const specialization = getSpecialization(specializationSlug);
  if (!country || !university || !specialization) return null;
  if (!university.specializations.includes(specializationSlug)) return null;
  return { country, university, specialization };
}

/**
 * "Real, complete, reviewed, published, sourced" — the approved decision's
 * exact bar, expressed against the fields StudyPlan actually has today:
 *  - programNameEn / source / sourceDate non-empty: not a stub row (the
 *    admin-authored path, src/app/admin/academic/actions.ts saveStudyPlan,
 *    has no completeness validation of its own — an admin CAN save an
 *    all-defaults row, so this function is the only place that catches it).
 *  - totalCreditHours > 0 and at least one real course across categories:
 *    not an empty placeholder plan.
 * "Approved and published" has no separate status field on
 * academicStudyPlans by design (see the table's own schema comment) — a row
 * only ever reaches it via a reviewed file or the RBAC-gated academic admin
 * editor. Existence in the table already means "published"; this function
 * is what additionally proves "complete and sourced", which existence alone
 * does not.
 */
export function isStudyPlanPublishable(plan: StudyPlan | null | undefined): plan is StudyPlan {
  if (!plan) return false;
  if (!plan.programNameEn.trim()) return false;
  if (!plan.source.trim()) return false;
  if (!plan.sourceDate.trim()) return false;
  if (!(plan.totalCreditHours > 0)) return false;
  if (!Array.isArray(plan.categories) || plan.categories.length === 0) return false;
  const totalCourses = plan.categories.reduce(
    (n, c) => n + (Array.isArray(c.courses) ? c.courses.length : 0),
    0
  );
  if (totalCourses === 0) return false;
  return true;
}

export type AcademicPageState =
  | { kind: "not-found" }
  | { kind: "route-valid"; route: AcademicRoute; plan: StudyPlan | null; indexable: boolean };

/** The one function page.tsx and generateMetadata both call. */
export async function getAcademicPageState(
  countrySlug: string,
  universitySlug: string,
  specializationSlug: string
): Promise<AcademicPageState> {
  const route = resolveAcademicRoute(countrySlug, universitySlug, specializationSlug);
  if (!route) return { kind: "not-found" };
  const plan = await getStudyPlan(countrySlug, universitySlug, specializationSlug);
  return { kind: "route-valid", route, plan, indexable: isStudyPlanPublishable(plan) };
}

/** Next.js Metadata["robots"] value for a non-indexable-but-real page. */
export const NOINDEX_FOLLOW = { index: false, follow: true } as const;

import { requireDb } from "@/db";
import { eq, and, inArray } from "drizzle-orm";
import {
  pipelineCurriculumVersions,
  pipelineCurriculumCourses,
  pipelineCourses,
  pipelineCoursePrerequisites,
  pipelinePrograms,
  pipelineUniversities,
  academicStudyPlans
} from "@/db/schema";
import type { StudyPlanCategory, StudyPlanCourse } from "@/lib/academic-study-plans";

// Renamed from compileAndPublishCurriculum: this function no longer
// publishes anything — it reads and validates the pipeline curriculum and
// returns a prepared (not-yet-executed) academicStudyPlans upsert query,
// so the caller can submit it atomically alongside the audit log insert via
// db.batch(). The old name became misleading the moment persistence moved
// out of this function (Phase 3.5B-2).
//
// No explicit return-type annotation on purpose: the prepared `upsert`
// query's exact Drizzle type must survive unchanged across the
// compiler/action module boundary so db.batch() can type-check it — a
// hand-written type here would risk silently diverging from what
// db.insert(...).onConflictDoUpdate(...) actually returns.
export async function prepareCurriculumPublish(curriculumVersionId: string) {
  const db = requireDb();

  // 1. Fetch the version, program, and university
  const [versionInfo] = await db.select({
    version: pipelineCurriculumVersions,
    program: pipelinePrograms,
    university: pipelineUniversities
  })
  .from(pipelineCurriculumVersions)
  .innerJoin(pipelinePrograms, eq(pipelineCurriculumVersions.programId, pipelinePrograms.id))
  .innerJoin(pipelineUniversities, eq(pipelinePrograms.universityId, pipelineUniversities.id))
  .where(eq(pipelineCurriculumVersions.id, curriculumVersionId))
  .limit(1);

  if (!versionInfo) {
    throw new Error("Curriculum version not found");
  }

  // Ensure it is approved before publishing
  if (versionInfo.version.status !== "approved") {
    throw new Error("Cannot publish a curriculum version that is not approved");
  }

  // 2. Fetch all courses for this curriculum
  const curriculumCourses = await db.select({
    currCourse: pipelineCurriculumCourses,
    baseCourse: pipelineCourses,
  })
  .from(pipelineCurriculumCourses)
  .innerJoin(pipelineCourses, eq(pipelineCurriculumCourses.courseId, pipelineCourses.id))
  .where(eq(pipelineCurriculumCourses.curriculumVersionId, curriculumVersionId))
  .orderBy(pipelineCurriculumCourses.position);

  // Governance floor (docs/factual-data-governance.md §6): a course must have
  // either evidenceId or an explicit confidence classification — LOW is an
  // acceptable, honest disclosure and must NOT be rejected for being LOW.
  // The only forbidden state is having neither signal at all.
  const coursesWithoutSignal = curriculumCourses.filter(
    (c) => c.currCourse.evidenceId === null && c.currCourse.confidence === null
  );
  if (coursesWithoutSignal.length > 0) {
    throw new Error(
      `Cannot publish: ${coursesWithoutSignal.length} course(s) have neither evidenceId nor confidence set`
    );
  }

  // 3. Fetch prerequisites for these courses
  const courseIds = curriculumCourses.map(c => c.currCourse.id);
  const prereqsQuery = courseIds.length > 0 
    ? await db.select().from(pipelineCoursePrerequisites).where(inArray(pipelineCoursePrerequisites.curriculumCourseId, courseIds))
    : [];
  
  // 4. Group into Categories
  const categoryMap = new Map<string, StudyPlanCategory>();

  for (const row of curriculumCourses) {
    const categoryName = row.currCourse.category || row.currCourse.courseType || "Unknown Requirements";
    
    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, {
        name: categoryName,
        creditHours: 0,
        courses: []
      });
    }

    const cat = categoryMap.get(categoryName)!;
    
    // Find prerequisites for this course
    const prereqsForCourse = prereqsQuery
      .filter(p => p.curriculumCourseId === row.currCourse.id)
      .map(p => p.prerequisiteText)
      .join(", ");

    const studyCourse: StudyPlanCourse = {
      number: row.currCourse.officialCourseCode || "TBD",
      name: row.currCourse.officialCourseName || row.baseCourse.normalizedName || "Unknown",
      creditHours: row.currCourse.credits || 0,
      theoretical: row.currCourse.theoreticalCredits || row.currCourse.credits || 0,
      practical: row.currCourse.practicalCredits || 0,
      prerequisite: prereqsForCourse || undefined
    };

    cat.courses.push(studyCourse);
    cat.creditHours += studyCourse.creditHours;
  }

  const finalCategories = Array.from(categoryMap.values());
  const totalCreditHours = finalCategories.reduce((sum, cat) => sum + cat.creditHours, 0);

  // 5. Prepare (do not execute) the upsert to `academic_study_plan`.
  const country = versionInfo.university.countrySlug;
  const university = versionInfo.university.universitySlug;
  const specialization = versionInfo.program.specializationSlug;

  // Read the true current row, if any, BEFORE the atomic write — this is
  // the last point at which "previous state" can be captured honestly. The
  // caller must submit the returned `upsert` (and the audit log describing
  // this exact snapshot) together, atomically, so a failed attempt never
  // lets a later retry mistake an already-applied new value for the
  // original one (see docs/factual-data-governance.md and Phase 3.5B-2).
  const [existing] = await db.select().from(academicStudyPlans).where(
    and(
      eq(academicStudyPlans.country, country),
      eq(academicStudyPlans.university, university),
      eq(academicStudyPlans.specialization, specialization)
    )
  ).limit(1);

  const overwrite = existing
    ? {
        previousTotalCreditHours: existing.totalCreditHours,
        previousCategories: existing.categories,
      }
    : null;

  const categoriesJson = JSON.stringify(finalCategories);

  // Single statement covers both the new-row and existing-row cases —
  // Postgres decides at execution time. Same canonical upsert primitive
  // already used against this exact unique key in
  // src/app/admin/academic/actions.ts's saveStudyPlan.
  //
  // Phase 3.5B-5: pipelineCurriculumVersionId is set to this exact
  // curriculumVersionId in BOTH branches (the fresh-row INSERT and the
  // conflict UPDATE) — provenance of a row's CURRENT contents must always
  // reflect whichever write most recently produced them, so an overwrite
  // publish must replace stale provenance from a prior version exactly as
  // certainly as it replaces stale content. This stays part of the same
  // prepared statement submitted atomically alongside the publish audit
  // insert via db.batch() in publishCurriculum — no separate write.
  const upsert = db.insert(academicStudyPlans).values({
    country,
    university,
    specialization,
    programNameEn: versionInfo.program.canonicalName || versionInfo.program.specializationSlug,
    degree: "Bachelor", // Default fallback if not in schema
    totalCreditHours,
    categories: categoriesJson,
    pipelineCurriculumVersionId: curriculumVersionId,
  }).onConflictDoUpdate({
    target: [
      academicStudyPlans.country,
      academicStudyPlans.university,
      academicStudyPlans.specialization,
    ],
    set: {
      totalCreditHours,
      categories: categoriesJson,
      pipelineCurriculumVersionId: curriculumVersionId,
      updatedAt: new Date(),
    },
  });

  return { country, university, specialization, upsert, overwrite };
}

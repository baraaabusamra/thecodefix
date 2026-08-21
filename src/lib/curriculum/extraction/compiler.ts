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

export async function compileAndPublishCurriculum(curriculumVersionId: string): Promise<boolean> {
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

  // 5. Upsert to `academic_study_plan`
  const country = versionInfo.university.countrySlug;
  const university = versionInfo.university.universitySlug;
  const specialization = versionInfo.program.specializationSlug;

  await db.transaction(async (tx) => {
    // Check if exists
    const [existing] = await tx.select().from(academicStudyPlans).where(
      and(
        eq(academicStudyPlans.country, country),
        eq(academicStudyPlans.university, university),
        eq(academicStudyPlans.specialization, specialization)
      )
    ).limit(1);

    if (existing) {
      await tx.update(academicStudyPlans)
        .set({
          totalCreditHours,
          categories: JSON.stringify(finalCategories),
          updatedAt: new Date()
        })
        .where(eq(academicStudyPlans.id, existing.id));
    } else {
      await tx.insert(academicStudyPlans).values({
        country,
        university,
        specialization,
        programNameEn: versionInfo.program.canonicalName || versionInfo.program.specializationSlug,
        degree: "Bachelor", // Default fallback if not in schema
        totalCreditHours,
        categories: JSON.stringify(finalCategories),
      });
    }
  });

  return true;
}

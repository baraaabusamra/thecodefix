import { requireDb } from "@/db";
import { eq, and } from "drizzle-orm";
import {
  pipelineExtractionRuns,
  pipelineCurriculumVersions,
  pipelineCourses,
  pipelineCurriculumCourses,
  pipelineCoursePrerequisites,
  pipelineExtractionEvidence,
  pipelineReviewQueue,
} from "@/db/schema";
import { GeminiCurriculumExtractor } from "./gemini";
import { ExtractionDocument, ProgramContext } from "./provider";
import { CURRICULUM_EXTRACTION_PROMPT_VERSION } from "./prompt";
import { calculateCourseConfidence } from "./confidence";

export async function runExtractionPipeline(
  document: ExtractionDocument,
  context: ProgramContext,
  programId: string,
  universityId: string,
  forceRetry: boolean = false
) {
  const db = requireDb();

  // 1. Idempotency Check
  if (!forceRetry) {
    const existingRun = await db.query.pipelineExtractionRuns.findFirst({
      where: (runs, { eq, and }) =>
        and(
          eq(runs.documentId, document.id),
          eq(runs.status, "completed"),
          eq(runs.promptVersion, CURRICULUM_EXTRACTION_PROMPT_VERSION)
        ),
    });

    if (existingRun) {
      console.log(`[EXTRACTION] Skipping document ${document.id}. Already extracted successfully.`);
      return { success: true, runId: existingRun.id, skipped: true };
    }
  }

  // 2. Execute Extraction
  const extractor = new GeminiCurriculumExtractor();
  const startTime = new Date();
  
  console.log(`[EXTRACTION] Starting extraction for document ${document.id}...`);
  const result = await extractor.extract(
    document,
    context,
    CURRICULUM_EXTRACTION_PROMPT_VERSION
  );
  
  const endTime = new Date();

  // 3. Handle Failure
  if (result.error || !result.data) {
    console.error(`[EXTRACTION] Failed for document ${document.id}: ${result.error}`);
    const [run] = await db.insert(pipelineExtractionRuns).values({
      documentId: document.id,
      model: process.env.CURRICULUM_EXTRACTION_MODEL || "claude-3-5-sonnet-20240620",
      promptVersion: CURRICULUM_EXTRACTION_PROMPT_VERSION,
      status: "failed",
      startedAt: startTime,
      completedAt: endTime,
      tokenUsage: result.tokenUsage?.input ? result.tokenUsage.input + result.tokenUsage.output : 0,
      error: result.error,
    }).returning({ id: pipelineExtractionRuns.id });
    
    return { success: false, runId: run.id, error: result.error };
  }

  const { data } = result;

  // 4. Transactional Persistence
  try {
    const runId = await db.transaction(async (tx) => {
      // 4a. Extraction Run
      const [run] = await tx.insert(pipelineExtractionRuns).values({
        documentId: document.id,
        model: process.env.CURRICULUM_EXTRACTION_MODEL || "claude-3-5-sonnet-20240620",
        promptVersion: CURRICULUM_EXTRACTION_PROMPT_VERSION,
        status: "completed",
        startedAt: startTime,
        completedAt: endTime,
        tokenUsage: result.tokenUsage?.input ? result.tokenUsage.input + result.tokenUsage.output : 0,
      }).returning({ id: pipelineExtractionRuns.id });

      // 4b. Curriculum Version
      const [curriculumVersion] = await tx.insert(pipelineCurriculumVersions).values({
        programId: programId,
        sourceId: document.sourceId,
        title: data.curriculum.title || "AI Extracted Curriculum",
        academicYear: data.curriculum.academicYear,
        version: "AI Draft",
        status: "draft"
      }).returning({ id: pipelineCurriculumVersions.id });

      // 4c. Process Courses
      let position = 0;
      for (const extractedCourse of data.courses) {
        position++;
        
        // Find or create Canonical Course scoped to this university
        // We do exact match on Code or Name to avoid duplicates within the same university
        const canonicalName = extractedCourse.code || extractedCourse.nameEn || extractedCourse.nameAr || "Unknown Course";
        
        let courseId: string;
        const [existingCourse] = await tx.select().from(pipelineCourses).where(
          and(
            eq(pipelineCourses.universityId, universityId),
            eq(pipelineCourses.canonicalName, canonicalName)
          )
        ).limit(1);

        if (existingCourse) {
          courseId = existingCourse.id;
        } else {
          const [newCourse] = await tx.insert(pipelineCourses).values({
            universityId,
            canonicalName,
            normalizedName: extractedCourse.nameEn || extractedCourse.nameAr,
          }).returning({ id: pipelineCourses.id });
          courseId = newCourse.id;
        }

        // Calculate deterministic confidence
        const confidence = calculateCourseConfidence(extractedCourse);

        // Insert Curriculum Course
        const [currCourse] = await tx.insert(pipelineCurriculumCourses).values({
          curriculumVersionId: curriculumVersion.id,
          courseId,
          officialCourseCode: extractedCourse.code,
          officialCourseName: extractedCourse.nameAr || extractedCourse.nameEn,
          credits: extractedCourse.credits,
          semester: extractedCourse.semester,
          courseType: extractedCourse.type,
          position,
          confidence: confidence.toUpperCase() as "HIGH" | "MEDIUM" | "LOW",
        }).returning({ id: pipelineCurriculumCourses.id });

        // Insert Evidence
        if (extractedCourse.evidence && extractedCourse.evidence.length > 0) {
          for (const ev of extractedCourse.evidence) {
            await tx.insert(pipelineExtractionEvidence).values({
              documentId: document.id,
              extractionRunId: run.id,
              pageNumber: ev.page,
              text: ev.quote,
              extractedField: ev.field,
            });
          }
        }

        // Insert Prerequisites
        if (extractedCourse.prerequisites && extractedCourse.prerequisites.length > 0) {
          for (const prereq of extractedCourse.prerequisites) {
            await tx.insert(pipelineCoursePrerequisites).values({
              curriculumCourseId: currCourse.id,
              prerequisiteText: prereq.courseCode || prereq.courseName || "Unknown",
              confidence: confidence.toUpperCase() as "HIGH" | "MEDIUM" | "LOW",
            });
          }
        }
      }

      // 4d. Push to Review Queue
      await tx.insert(pipelineReviewQueue).values({
        curriculumVersionId: curriculumVersion.id,
        extractionRunId: run.id,
        reason: "AI Extraction Ready for Review",
        status: "pending",
      });

      return run.id;
    });

    console.log(`[EXTRACTION] Successfully persisted curriculum version for document ${document.id}. Run ID: ${runId}`);
    return { success: true, runId, skipped: false };
    
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[EXTRACTION] Transaction failed for document ${document.id}: ${message}`);
    // Record the transaction failure as an extraction run error
    await db.insert(pipelineExtractionRuns).values({
      documentId: document.id,
      model: process.env.CURRICULUM_EXTRACTION_MODEL || "claude-3-5-sonnet-20240620",
      promptVersion: CURRICULUM_EXTRACTION_PROMPT_VERSION,
      status: "failed",
      startedAt: startTime,
      completedAt: new Date(),
      error: "DB_TRANSACTION_FAILED: " + message,
    });

    return { success: false, error: message };
  }
}

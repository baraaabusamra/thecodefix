import { requireDb } from "@/db";
import { eq, and, sql } from "drizzle-orm";
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
import { assertCurriculumExtractionEnabled } from "@/lib/flags";

// Phase 3.5B-4 (P1: duplicate paid-AI spend). Stale-claim threshold: a
// 'started' extraction-run row older than this is treated as abandoned
// (crashed process) and eligible for takeover. Matches the repository's
// existing convention for the same category of problem —
// src/lib/curriculum/jobs/claim.ts's claimNextJob() uses the same
// 15-minute window for pipeline_collection_job — not an arbitrary number.
const EXTRACTION_CLAIM_STALE_MINUTES = 15;

// The partial unique index enforcing "at most one active (started) run per
// (documentId, promptVersion)" — src/db/schema.ts, pipelineExtractionRuns.
const ACTIVE_CLAIM_INDEX = "pipeline_extraction_run_one_active_per_document";

// `instanceof NeonDbError` is unreliable across this codebase's CJS/ESM
// module-resolution boundary, so use the plain `.name`, `.code`, and
// `.constraint` fields to recognize this one expected conflict.
function isActiveClaimConflict(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    (e as { name?: unknown }).name === "NeonDbError" &&
    (e as { code?: unknown }).code === "23505" &&
    (e as { constraint?: unknown }).constraint === ACTIVE_CLAIM_INDEX
  );
}

// Atomically claims the (documentId, promptVersion) logical extraction key
// BEFORE any paid AI call is made — the authoritative fix for the race
// this phase closes: previously nothing was written to the DB until AFTER
// the AI call had already returned, so two concurrent callers could both
// pass the completed-run check and both call the paid provider unguarded.
//
// Two-step, and in BOTH steps the DB partial unique index (not an
// application-level pre-check) is the actual concurrency authority — a
// bare "SELECT no active run, then INSERT" is provably racy, the same
// reasoning already established for the same-queue (3.5B-3A) and
// same-program (3.5B-3B) fixes:
//   1. Plain INSERT of a new 'started' row. If it conflicts (23505 on the
//      active-claim index), some other 'started' row already exists for
//      this key.
//   2. Only on that conflict: one writable-CTE statement that atomically
//      (a) marks the existing row 'failed' IF it's stale (startedAt older
//      than EXTRACTION_CLAIM_STALE_MINUTES), and (b) inserts a new claim
//      — in the SAME statement, so a crashed process's abandoned claim
//      can never wedge this document forever, without reintroducing a
//      "SELECT stale, then UPDATE, then INSERT" race. The `claim` CTE
//      reads FROM `still_active`, which reads FROM `stale`, so Postgres is
//      guaranteed to fully apply the stale UPDATE (freeing its index entry)
//      before the new INSERT is attempted. If a genuinely concurrent second
//      stale-recovery attempt
//      wins first, this INSERT hits the same unique index and throws —
//      caught the same way as step 1.
// Returns the new run's id if a claim was acquired, or null if not — the
// caller must not proceed to the paid AI call in that case.
async function acquireExtractionClaim(
  db: ReturnType<typeof requireDb>,
  documentId: string,
  promptVersion: string,
  model: string,
  now: Date
): Promise<string | null> {
  const plainClaimId = crypto.randomUUID();
  try {
    const result = await db.execute(sql`
      INSERT INTO "pipeline_extraction_run" ("id", "documentId", "promptVersion", "model", "status", "startedAt")
      VALUES (${plainClaimId}, ${documentId}, ${promptVersion}, ${model}, 'started', ${now})
      RETURNING "id"
    `);
    if (result.rows.length > 0) return plainClaimId;
  } catch (e: unknown) {
    if (!isActiveClaimConflict(e)) throw e;
    // Fall through to the stale-takeover attempt below.
  }

  const staleCutoff = new Date(now.getTime() - EXTRACTION_CLAIM_STALE_MINUTES * 60_000);
  const takeoverClaimId = crypto.randomUUID();
  try {
    const result = await db.execute(sql`
      WITH stale AS (
        UPDATE "pipeline_extraction_run"
        SET "status" = 'failed', "completedAt" = ${now}, "error" = 'Stale extraction claim recovered'
        WHERE "documentId" = ${documentId}
          AND COALESCE("promptVersion", '') = COALESCE(${promptVersion}, '')
          AND "status" = 'started'
          AND "startedAt" < ${staleCutoff}
        RETURNING "id"
      ),
      still_active AS (
        SELECT "id" FROM "pipeline_extraction_run"
        WHERE "documentId" = ${documentId}
          AND COALESCE("promptVersion", '') = COALESCE(${promptVersion}, '')
          AND "status" = 'started'
          AND "id" NOT IN (SELECT "id" FROM stale)
      ),
      claim AS (
        INSERT INTO "pipeline_extraction_run" ("id", "documentId", "promptVersion", "model", "status", "startedAt")
        SELECT ${takeoverClaimId}, ${documentId}, ${promptVersion}, ${model}, 'started', ${now}
        WHERE NOT EXISTS (SELECT 1 FROM still_active)
        RETURNING "id"
      )
      SELECT "id" FROM claim
    `);
    if (result.rows.length > 0) return takeoverClaimId;
    return null; // existing claim is not stale — genuinely still active
  } catch (e: unknown) {
    if (!isActiveClaimConflict(e)) throw e;
    return null; // lost a concurrent stale-takeover race
  }
}

export async function runExtractionPipeline(
  document: ExtractionDocument,
  context: ProgramContext,
  programId: string,
  universityId: string,
  forceRetry: boolean = false
) {
  // Last-line server-side protection: no direct caller may reach the database
  // claim or paid provider merely because provider credentials are present.
  assertCurriculumExtractionEnabled();
  const db = requireDb();

  // 1. Idempotency Check — completed history only. Unchanged by Phase
  // 3.5B-4: forceRetry bypasses this (the only thing it has ever bypassed
  // — a failed run was already invisible to this check regardless of
  // forceRetry), but never bypasses the active-claim check in step 2.
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

  const model = process.env.CURRICULUM_EXTRACTION_MODEL || "claude-3-5-sonnet-20240620";
  const claimedAt = new Date();

  // 2. Acquire the active claim BEFORE the paid AI call. This is the
  // authoritative guard — see acquireExtractionClaim's own comment.
  const runId = await acquireExtractionClaim(
    db,
    document.id,
    CURRICULUM_EXTRACTION_PROMPT_VERSION,
    model,
    claimedAt
  );
  if (!runId) {
    console.log(`[EXTRACTION] Skipping document ${document.id}. Another extraction attempt is already active.`);
    return { success: true, skipped: true, reason: "already_running" as const };
  }

  // 3. Execute Extraction — only the claim owner reaches this point.
  const extractor = new GeminiCurriculumExtractor();

  console.log(`[EXTRACTION] Starting extraction for document ${document.id}...`);
  let result;
  try {
    result = await extractor.extract(
      document,
      context,
      CURRICULUM_EXTRACTION_PROMPT_VERSION
    );
  } catch (error: unknown) {
    // Defensive: GeminiCurriculumExtractor.extract() catches its own API
    // errors internally and returns a structured {error} result rather
    // than throwing, but the claim row must not be left at 'started'
    // forever if some other unexpected exception escapes here anyway.
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[EXTRACTION] Provider threw for document ${document.id}: ${message}`);
    await db.update(pipelineExtractionRuns)
      .set({ status: "failed", error: "AI_PROVIDER_THREW: " + message, completedAt: new Date() })
      .where(eq(pipelineExtractionRuns.id, runId));
    return { success: false, runId, error: message };
  }

  const endTime = new Date();

  // 4. Handle Failure — update the SAME claim row created in step 2.
  // Never insert a second row for this attempt (Phase 3.5A invariant,
  // unchanged: one attempt = one extraction-run row).
  if (result.error || !result.data) {
    console.error(`[EXTRACTION] Failed for document ${document.id}: ${result.error}`);
    await db.update(pipelineExtractionRuns)
      .set({
        status: "failed",
        error: result.error,
        completedAt: endTime,
        tokenUsage: result.tokenUsage?.input ? result.tokenUsage.input + result.tokenUsage.output : 0,
      })
      .where(eq(pipelineExtractionRuns.id, runId));

    return { success: false, runId, error: result.error };
  }

  const { data } = result;

  // Record token usage as soon as it's known, independent of whether
  // persistence below succeeds — matches the original behavior where this
  // was captured at insert time, before persistence began.
  await db.update(pipelineExtractionRuns)
    .set({ tokenUsage: result.tokenUsage?.input ? result.tokenUsage.input + result.tokenUsage.output : 0 })
    .where(eq(pipelineExtractionRuns.id, runId));

  // 5. Persistence. Sequential, not transactional: the neon-http driver has
  // no interactive-transaction support (db.transaction() throws), so this
  // can't be made atomic. The review-queue row is inserted last so a
  // partial failure never surfaces an incomplete curriculum to a reviewer.
  //
  // The claim row (already 'started' since step 2) is only ever promoted
  // to "completed" after every write below (including the review-queue
  // insert) has succeeded. This matters because the idempotency check at
  // the top of this function treats status:"completed" as "safe to skip
  // on retry" — if that status were set before persistence finished, a
  // mid-persistence failure would leave a run that reads as fully
  // successful while the review queue (and possibly some courses/evidence)
  // were never created, permanently hiding the result and permanently
  // blocking retry.
  try {
    // 5a. Curriculum Version
    const [curriculumVersion] = await db.insert(pipelineCurriculumVersions).values({
      programId: programId,
      sourceId: document.sourceId,
      title: data.curriculum.title || "AI Extracted Curriculum",
      academicYear: data.curriculum.academicYear,
      version: "AI Draft",
      status: "draft"
    }).returning({ id: pipelineCurriculumVersions.id });

    // 5b. Process Courses
    let position = 0;
    for (const extractedCourse of data.courses) {
      position++;

      // Find or create Canonical Course scoped to this university
      // We do exact match on Code or Name to avoid duplicates within the same university
      const canonicalName = extractedCourse.code || extractedCourse.nameEn || extractedCourse.nameAr || "Unknown Course";

      let courseId: string;
      const [existingCourse] = await db.select().from(pipelineCourses).where(
        and(
          eq(pipelineCourses.universityId, universityId),
          eq(pipelineCourses.canonicalName, canonicalName)
        )
      ).limit(1);

      if (existingCourse) {
        courseId = existingCourse.id;
      } else {
        const [newCourse] = await db.insert(pipelineCourses).values({
          universityId,
          canonicalName,
          normalizedName: extractedCourse.nameEn || extractedCourse.nameAr,
        }).returning({ id: pipelineCourses.id });
        courseId = newCourse.id;
      }

      // Calculate deterministic confidence
      const confidence = calculateCourseConfidence(extractedCourse);

      // Insert Curriculum Course
      const [currCourse] = await db.insert(pipelineCurriculumCourses).values({
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

      // Insert Evidence. extractedCourse.evidence is nested inside this
      // specific course in the AI's structured output (see
      // ExtractedCourseSchema in ./schema.ts), so every entry here is a real,
      // provable match for this course — not a guess. Link the course to its
      // first evidence entry: pipelineCurriculumCourses.evidenceId is a
      // single FK, so it can only capture one representative piece of
      // evidence even when a course has several (one per field); that's a
      // real limitation of the column's 1:1 cardinality, not something this
      // insert can fix without a schema change.
      if (extractedCourse.evidence && extractedCourse.evidence.length > 0) {
        let firstEvidenceId: string | null = null;
        for (const ev of extractedCourse.evidence) {
          const [insertedEvidence] = await db.insert(pipelineExtractionEvidence).values({
            documentId: document.id,
            extractionRunId: runId,
            pageNumber: ev.page,
            text: ev.quote,
            extractedField: ev.field,
          }).returning({ id: pipelineExtractionEvidence.id });
          if (!firstEvidenceId) firstEvidenceId = insertedEvidence.id;
        }

        await db.update(pipelineCurriculumCourses)
          .set({ evidenceId: firstEvidenceId })
          .where(eq(pipelineCurriculumCourses.id, currCourse.id));
      }

      // Insert Prerequisites
      if (extractedCourse.prerequisites && extractedCourse.prerequisites.length > 0) {
        for (const prereq of extractedCourse.prerequisites) {
          await db.insert(pipelineCoursePrerequisites).values({
            curriculumCourseId: currCourse.id,
            prerequisiteText: prereq.courseCode || prereq.courseName || "Unknown",
            confidence: confidence.toUpperCase() as "HIGH" | "MEDIUM" | "LOW",
          });
        }
      }
    }

    // 5c. Push to Review Queue
    await db.insert(pipelineReviewQueue).values({
      curriculumVersionId: curriculumVersion.id,
      extractionRunId: runId,
      reason: "AI Extraction Ready for Review",
      status: "pending",
    });

    // 5d. Only now — after the review queue row (the last piece a human
    // reviewer needs) has actually been created — may this run be marked
    // completed. This is the one write that determines whether the
    // idempotency check above will ever skip this document again.
    await db.update(pipelineExtractionRuns)
      .set({ status: "completed" })
      .where(eq(pipelineExtractionRuns.id, runId));

    console.log(`[EXTRACTION] Successfully persisted curriculum version for document ${document.id}. Run ID: ${runId}`);
    return { success: true, runId, skipped: false };

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[EXTRACTION] Persistence failed for document ${document.id}: ${message}`);

    // One attempt = one extraction-run row: mark the SAME claim row
    // failed rather than leaving it at "started" and inserting a second
    // row. Never "completed" — the retry/idempotency check above stays
    // correctly eligible for a fresh attempt, and the active-claim index
    // entry is released the instant this write commits (its predicate no
    // longer matches).
    await db.update(pipelineExtractionRuns)
      .set({ status: "failed", error: "DB_WRITE_FAILED: " + message, completedAt: new Date() })
      .where(eq(pipelineExtractionRuns.id, runId));

    return { success: false, error: message };
  }
}

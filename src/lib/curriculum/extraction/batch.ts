import { requireDb } from "@/db";
import {
  pipelineDocuments,
  pipelineSources,
  pipelineUniversities,
  pipelinePrograms,
  pipelineExtractionRuns,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { runExtractionPipeline } from "./pipeline";
import { CURRICULUM_EXTRACTION_PROMPT_VERSION } from "./prompt";
import { assertCurriculumExtractionEnabled } from "@/lib/flags";

export interface ExtractionBatchResult {
  documentId: string;
  url: string;
  success: boolean;
  error?: string;
}

/**
 * Runs extraction on collected documents that don't yet have a completed
 * run for the current prompt version. Skips documents with no usable text
 * or no linked program (a curriculum version requires a programId).
 */
export async function runExtractionForPendingDocuments(
  maxDocs: number = 3
): Promise<{ processed: number; results: ExtractionBatchResult[] }> {
  // Keep the gate ahead of requireDb() so a disabled run has zero database or
  // provider side effects even when this helper is called outside the admin UI.
  assertCurriculumExtractionEnabled();
  const db = requireDb();

  const completedRuns = await db
    .select({ documentId: pipelineExtractionRuns.documentId })
    .from(pipelineExtractionRuns)
    .where(
      and(
        eq(pipelineExtractionRuns.status, "completed"),
        eq(pipelineExtractionRuns.promptVersion, CURRICULUM_EXTRACTION_PROMPT_VERSION)
      )
    );
  const alreadyExtracted = new Set(completedRuns.map((r) => r.documentId));

  const candidates = await db
    .select({ doc: pipelineDocuments, source: pipelineSources })
    .from(pipelineDocuments)
    .innerJoin(pipelineSources, eq(pipelineDocuments.sourceId, pipelineSources.id))
    .where(eq(pipelineDocuments.status, "completed"))
    .limit(100);

  const results: ExtractionBatchResult[] = [];
  let processed = 0;

  for (const { doc, source } of candidates) {
    if (processed >= maxDocs) break;
    if (alreadyExtracted.has(doc.id)) continue;
    if (!doc.extractedText) continue;
    if (!source.programId) continue;

    const [university] = await db
      .select()
      .from(pipelineUniversities)
      .where(eq(pipelineUniversities.id, source.universityId));
    if (!university) continue;

    const [program] = await db
      .select()
      .from(pipelinePrograms)
      .where(eq(pipelinePrograms.id, source.programId));
    if (!program) continue;

    const result = await runExtractionPipeline(
      {
        id: doc.id,
        sourceId: doc.sourceId,
        url: doc.url,
        mimeType: doc.mimeType,
        contentHash: doc.contentHash,
        extractedText: doc.extractedText,
        pageCount: doc.pageCount,
      },
      {
        country: university.countrySlug,
        university: university.universitySlug,
        specialization: program.specializationSlug,
        degree: "Bachelor",
      },
      program.id,
      university.id
    );

    results.push({
      documentId: doc.id,
      url: doc.url,
      success: result.success,
      error: result.error ?? undefined,
    });
    processed++;
  }

  return { processed, results };
}

import { requireDb } from "@/db";
import { eq } from "drizzle-orm";
import { pipelineDocuments, pipelineSources, pipelinePrograms, pipelineUniversities } from "@/db/schema";
import { runExtractionPipeline } from "@/lib/curriculum/extraction/pipeline";
import { ExtractionDocument, ProgramContext } from "@/lib/curriculum/extraction/provider";

async function runExtractionPilot() {
  console.log("Starting Gemini AI Extraction Pilot (Phase 4)...");
  
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  const hasGeminiModel = !!process.env.GEMINI_EXTRACTION_MODEL;
  console.log(`GEMINI_API_KEY exists: ${hasGeminiKey}`);
  console.log(`GEMINI_EXTRACTION_MODEL exists: ${hasGeminiModel}`);
  
  if (!hasGeminiKey || !hasGeminiModel) {
    console.error("Fatal: GEMINI_API_KEY or GEMINI_EXTRACTION_MODEL is not set. Aborting pilot.");
    process.exit(1);
  }
  
  const db = requireDb();

  // 1. Select 3-5 high-quality PDFs from the DB (e.g. ones with extracted text and pdf parser)
  const docs = await db.select({
    document: pipelineDocuments,
    source: pipelineSources,
    program: pipelinePrograms,
    university: pipelineUniversities
  })
  .from(pipelineDocuments)
  .innerJoin(pipelineSources, eq(pipelineDocuments.sourceId, pipelineSources.id))
  .innerJoin(pipelinePrograms, eq(pipelineSources.programId, pipelinePrograms.id))
  .innerJoin(pipelineUniversities, eq(pipelinePrograms.universityId, pipelineUniversities.id))
  .where(eq(pipelineDocuments.parser, "pdf-parse"));
  
  // Try to pick diverse ones if possible, but for pilot just pick up to 4 that have text.
  const validDocs = docs.filter(d => d.document.extractedText && d.document.extractedText.trim().length > 100);
  
  // Deduplicate by hash
  const seenHashes = new Set<string>();
  const uniqueDocs = validDocs.filter(d => {
    if (d.document.contentHash && seenHashes.has(d.document.contentHash)) return false;
    if (d.document.contentHash) seenHashes.add(d.document.contentHash);
    return true;
  });
  
  const selected = uniqueDocs.slice(0, 4);

  if (selected.length === 0) {
    console.log("No valid PDF documents found for extraction. Please ensure Pilot V2 succeeded.");
    return;
  }

  console.log(`Selected ${selected.length} documents for the pilot.`);

  for (const item of selected) {
    console.log(`\n--- Processing Document ID: ${item.document.id} ---`);
    console.log(`University: ${item.university.universitySlug}`);
    console.log(`Program: ${item.program.specializationSlug}`);
    console.log(`URL: ${item.document.url}`);

    const doc: ExtractionDocument = {
      id: item.document.id,
      sourceId: item.document.sourceId,
      url: item.document.url,
      mimeType: item.document.mimeType,
      contentHash: item.document.contentHash,
      extractedText: item.document.extractedText,
      pageCount: item.document.pageCount
    };

    const context: ProgramContext = {
      country: item.university.countrySlug,
      university: item.university.universitySlug,
      specialization: item.program.canonicalName || item.program.specializationSlug,
      degree: "Bachelor"
    };

    // Execute pipeline (idempotent)
    const result = await runExtractionPipeline(
      doc, 
      context, 
      item.program.id, 
      item.university.id, 
      false // do not force retry if already extracted
    );

    if (result.success) {
      console.log(`✅ Extraction successful! Run ID: ${result.runId}`);
    } else {
      console.log(`❌ Extraction failed: ${result.error}`);
    }
  }

  console.log("\nPilot Extraction Complete. Please review the results in the Admin UI.");
  process.exit(0);
}

runExtractionPilot().catch(err => {
  console.error("Fatal Pilot Error:", err);
  process.exit(1);
});

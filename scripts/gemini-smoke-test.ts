import { GeminiCurriculumExtractor } from "../src/lib/curriculum/extraction/gemini";
import type { ExtractionDocument, ProgramContext } from "../src/lib/curriculum/extraction/provider";
import { assertCurriculumExtractionEnabled } from "../src/lib/flags";
import { config } from "dotenv";

async function runSmokeTest() {
  console.log("--- GEMINI EXTRACTION SMOKE TEST ---");
  config({ path: ".env" });
  config({ path: ".env.local", override: true });
  assertCurriculumExtractionEnabled();

  const extractor = new GeminiCurriculumExtractor();

  const dummyDoc: ExtractionDocument = {
    id: "dummy-123",
    sourceId: "src-123",
    mimeType: "application/pdf",
    contentHash: "hash",
    extractedText: "The Software Engineering program requires 120 credits. Course CS101: Introduction to Programming (3 credits). Prerequisites: None.",
    pageCount: 1,
    url: "http://dummy"
  };

  const context: ProgramContext = {
    university: "Dummy University",
    country: "Dummy Country",
    degree: "Bachelor",
    specialization: "Software Engineering"
  };

  try {
    const result = await extractor.extract(dummyDoc, context, "v1");

    if (result.error) {
      console.error("[Smoke Test] Failed:", result.error);
      process.exit(1);
    }

    if (!result.data) {
      console.error("[Smoke Test] Failed: No data returned.");
      process.exit(1);
    }

    console.log("[Smoke Test] Success!");
    console.log(`[Smoke Test] Curriculum: ${result.data.curriculum.title}`);
    console.log(`[Smoke Test] Courses extracted: ${result.data.courses.length}`);
    console.log(`[Smoke Test] JSON Validated by Zod: true`);
  } catch (e: unknown) {
    console.error("[Smoke Test] Unexpected Error:", e);
    process.exit(1);
  }
}

runSmokeTest();

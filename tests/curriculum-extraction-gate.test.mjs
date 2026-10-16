import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertCurriculumExtractionEnabled,
  CURRICULUM_EXTRACTION_DISABLED_MESSAGE,
  isCurriculumExtractionEnabled,
} from "../packages/core/src/flags.js";

test("curriculum extraction is fail-closed and requires an explicit true flag", () => {
  const originalValue = process.env.CURRICULUM_EXTRACTION_ENABLED;

  try {
    delete process.env.CURRICULUM_EXTRACTION_ENABLED;
    assert.equal(isCurriculumExtractionEnabled(), false);
    assert.throws(
      () => assertCurriculumExtractionEnabled(),
      new RegExp(CURRICULUM_EXTRACTION_DISABLED_MESSAGE)
    );

    for (const value of ["", "false", "0", "1", "yes", "enabled"]) {
      process.env.CURRICULUM_EXTRACTION_ENABLED = value;
      assert.equal(isCurriculumExtractionEnabled(), false, `${value || "empty"} must remain disabled`);
    }

    for (const value of ["true", "TRUE", " true "]) {
      process.env.CURRICULUM_EXTRACTION_ENABLED = value;
      assert.equal(isCurriculumExtractionEnabled(), true, `${value} must explicitly enable extraction`);
      assert.doesNotThrow(() => assertCurriculumExtractionEnabled());
    }
  } finally {
    if (originalValue === undefined) {
      delete process.env.CURRICULUM_EXTRACTION_ENABLED;
    } else {
      process.env.CURRICULUM_EXTRACTION_ENABLED = originalValue;
    }
  }
});

test("every paid-extraction entry point checks the server gate before side effects", () => {
  const actionSource = readFileSync("modules/academic/src/actions/admin-pipeline.ts", "utf8");
  const batchSource = readFileSync("modules/academic/src/pipeline/extraction/batch.ts", "utf8");
  const pipelineSource = readFileSync("modules/academic/src/pipeline/extraction/pipeline.ts", "utf8");
  const smokeTestSource = readFileSync("scripts/gemini-smoke-test.ts", "utf8");

  const actionBody = actionSource.slice(actionSource.indexOf("export async function runExtractionBatch"));
  assert.ok(actionBody.indexOf("await assertPipelineTestAccess()") >= 0);
  assert.ok(
    actionBody.indexOf("await assertPipelineTestAccess()") <
      actionBody.indexOf("assertCurriculumExtractionEnabled()"),
    "authorization must run before the action discloses feature state"
  );
  assert.ok(
    actionBody.indexOf("assertCurriculumExtractionEnabled()") <
      actionBody.indexOf("runExtractionForPendingDocuments"),
    "the action gate must precede the batch call"
  );

  const batchBody = batchSource.slice(
    batchSource.indexOf("export async function runExtractionForPendingDocuments")
  );
  assert.ok(
    batchBody.indexOf("assertCurriculumExtractionEnabled()") <
      batchBody.indexOf("const db = requireDb()"),
    "the batch gate must precede database access"
  );

  const pipelineBody = pipelineSource.slice(
    pipelineSource.indexOf("export async function runExtractionPipeline")
  );
  assert.ok(
    pipelineBody.indexOf("assertCurriculumExtractionEnabled()") <
      pipelineBody.indexOf("const db = requireDb()"),
    "the direct pipeline gate must precede database access"
  );
  assert.ok(
    pipelineBody.indexOf("assertCurriculumExtractionEnabled()") <
      pipelineBody.indexOf("new GeminiCurriculumExtractor"),
    "the direct pipeline gate must precede provider construction"
  );
  assert.ok(
    smokeTestSource.indexOf("assertCurriculumExtractionEnabled()") <
      smokeTestSource.indexOf("new GeminiCurriculumExtractor"),
    "the smoke-test gate must precede provider construction"
  );
});

test("the admin UI receives and visibly enforces the same server-side gate", () => {
  const pageSource = readFileSync("apps/web/src/app/admin/pipeline/test/page.tsx", "utf8");
  const clientSource = readFileSync("apps/web/src/app/admin/pipeline/test/client.tsx", "utf8");

  assert.match(pageSource, /isCurriculumExtractionEnabled\(\)/);
  assert.match(pageSource, /<TestClient extractionEnabled=\{extractionEnabled\}/);
  assert.match(clientSource, /disabled=\{extractionLoading \|\| !extractionEnabled\}/);
  assert.match(clientSource, /لا يتم إجراء أي اتصال بمزوّد AI/);
});

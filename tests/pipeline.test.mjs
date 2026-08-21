import test from "node:test";
import assert from "node:assert";
import { isSafeHostname, isOfficialDomain } from "../src/lib/curriculum/discovery/domain.js";
import { rankSource } from "../src/lib/curriculum/discovery/ranking.js";
import { validatePdf } from "../src/lib/curriculum/collection/pdf.js";

test("Domain Validation - isOfficialDomain", () => {
  assert.strictEqual(isOfficialDomain("ju.edu.jo", "ju.edu.jo"), true);
  assert.strictEqual(isOfficialDomain("ju.edu.jo", "faculty.ju.edu.jo"), true);
  assert.strictEqual(isOfficialDomain("ju.edu.jo", "attacker-ju.edu.jo"), false);
  assert.strictEqual(isOfficialDomain("ju.edu.jo", "ju.edu.jo.attacker.com"), false);
});

test("SSRF Protection - isSafeHostname (Local/Private)", async () => {
  // Should reject local/private
  assert.strictEqual(await isSafeHostname("localhost"), false);
  assert.strictEqual(await isSafeHostname("127.0.0.1"), false);
  assert.strictEqual(await isSafeHostname("10.0.0.5"), false);
  assert.strictEqual(await isSafeHostname("192.168.1.1"), false);
  assert.strictEqual(await isSafeHostname("169.254.169.254"), false);
  assert.strictEqual(await isSafeHostname("::1"), false);
  
  // Should allow public (google.com)
  assert.strictEqual(await isSafeHostname("google.com"), true);
});

test("Source Ranking", () => {
  // Official curriculum pdf
  const r1 = rankSource("https://ju.edu.jo/curriculum.pdf", "Study Plan", "ju.edu.jo");
  assert.strictEqual(r1.isOfficialDomain, true);
  assert.strictEqual(r1.category, "official_pdf");
  assert.strictEqual(r1.score, 95);

  // Official general page
  const r2 = rankSource("https://ju.edu.jo/about", "About Us", "ju.edu.jo");
  assert.strictEqual(r2.category, "official_document");
  assert.strictEqual(r2.score, 75);

  // External source
  const r3 = rankSource("https://example.com/curriculum.pdf", "Study Plan", "ju.edu.jo");
  assert.strictEqual(r3.isOfficialDomain, false);
  assert.strictEqual(r3.category, "fallback_external");
  assert.strictEqual(r3.score, 50);
});

test("PDF Validation - Invalid Signature", async () => {
  // Must be >= 100 bytes so it clears the size check and actually exercises
  // the signature check (a buffer that's just too small hits INVALID_SIZE first).
  const invalidBuffer = Buffer.from("This is just some text, not a PDF. ".repeat(4));
  const res = await validatePdf(invalidBuffer);
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.error?.includes("INVALID_SIGNATURE"), true);
});

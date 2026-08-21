import test from "node:test";
import assert from "node:assert";
import { validatePdf } from "../src/lib/curriculum/collection/pdf.js";
import { safeFetch } from "../src/lib/curriculum/collection/fetcher.js";

test("PDF Validation - Parser Import Compatibility", async () => {
  // Test if it doesn't crash on invalid small buffers
  const smallBuffer = Buffer.from("123");
  const res1 = await validatePdf(smallBuffer);
  assert.strictEqual(res1.isValid, false);
  assert.strictEqual(res1.error?.includes("INVALID_SIZE"), true);
});

test("PDF Validation - Invalid/Corrupted PDF", async () => {
  const largeInvalidBuffer = Buffer.alloc(500, "X");
  const res = await validatePdf(largeInvalidBuffer);
  assert.strictEqual(res.isValid, false);
  assert.strictEqual(res.error?.includes("INVALID_SIGNATURE"), true);
});

test("TLS - Normal Valid HTTPS", async () => {
  const result = await safeFetch("https://example.com");
  assert.strictEqual(result.status, 200);
});

test("TLS - Invalid Certificate (Unapproved)", async () => {
  try {
    // expired.badssl.com has an expired certificate
    await safeFetch("https://expired.badssl.com");
    assert.fail("Should have thrown TLS error");
  } catch (err) {
    assert.strictEqual(err.message.includes("TLS_CERTIFICATE_ERROR"), true);
  }
});

test("TLS - SSRF Blocked Despite TLS Exception", async () => {
  try {
    // If someone managed to point usthb.dz to 127.0.0.1 (not possible externally, but simulating SSRF)
    // We will just test with an IP directly, but let's assume we pass something that bypasses DNS but resolves to private.
    // Instead of mocking DNS, we just test that the SSRF check is still throwing.
    await safeFetch("http://169.254.169.254");
    assert.fail("Should have thrown SSRF");
  } catch (err) {
    assert.strictEqual(err.message.includes("SSRF"), true);
  }
});

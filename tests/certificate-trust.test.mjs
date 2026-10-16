import test from "node:test";
import assert from "node:assert";
import { certificateTrust } from "../modules/certificates/src/certificates.ts";

test("certificateTrust: a legacy row (no exam attempt) is never 'verified'", () => {
  assert.equal(certificateTrust({ status: "valid", examAttemptId: null }), "legacy");
});

test("certificateTrust: only a server-graded exam attempt makes a row 'verified'", () => {
  assert.equal(certificateTrust({ status: "valid", examAttemptId: "attempt-1" }), "verified");
});

test("certificateTrust: revocation wins over everything", () => {
  assert.equal(certificateTrust({ status: "revoked", examAttemptId: "attempt-1" }), "revoked");
  assert.equal(certificateTrust({ status: "revoked", examAttemptId: null }), "revoked");
});

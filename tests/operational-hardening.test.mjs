import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

import {
  redactMonitoringText,
  safeRequestPath,
  sanitizeMonitoringContext,
} from "../packages/observability/src/monitoring-contract.ts";
import { normalizeCspReports } from "../packages/observability/src/csp-report.ts";
import { readRequestBodyWithLimit } from "../packages/core/src/request-body.ts";

test("monitoring redacts common secrets and personal data", () => {
  const redacted = redactMonitoringText(
    "user@example.com Bearer top-secret https://example.com/path?token=secret&ok=1 " +
      "postgres://db-user:db-password@db.example.com/app password=hunter2"
  );
  assert.doesNotMatch(redacted, /user@example\.com/);
  assert.doesNotMatch(redacted, /top-secret/);
  assert.doesNotMatch(redacted, /token=secret/);
  assert.doesNotMatch(redacted, /db-password/);
  assert.doesNotMatch(redacted, /hunter2/);
  assert.equal(
    safeRequestPath("/checkout?email=user@example.com&token=secret"),
    "/checkout"
  );
  assert.deepEqual(
    sanitizeMonitoringContext({ source: "checkout", email: "hidden@example.com" }),
    { source: "checkout" }
  );
});

test("request body reader enforces the byte cap even without Content-Length", async () => {
  const accepted = await readRequestBodyWithLimit(
    new Request("https://example.com", { method: "POST", body: "1234" }),
    4
  );
  const rejected = await readRequestBodyWithLimit(
    new Request("https://example.com", { method: "POST", body: "12345" }),
    4
  );
  assert.equal(accepted, "1234");
  assert.equal(rejected, null);
});

test("CSP report normalization strips query strings and rejects arbitrary fields", () => {
  const reports = normalizeCspReports({
    "csp-report": {
      "document-uri": "https://thecodefix.net/playground?code=private",
      "blocked-uri": "https://evil.example/script.js?token=secret",
      "effective-directive": "script-src-elem",
      "source-file": "https://thecodefix.net/_next/app.js?build=1",
      "line-number": 12,
      attackerControlled: "must not survive",
    },
  });

  assert.deepEqual(reports, [
    {
      documentPath: "/playground",
      blockedUrl: "https://evil.example/script.js",
      directive: "script-src-elem",
      sourceUrl: "https://thecodefix.net/_next/app.js",
      line: 12,
    },
  ]);
});

test("Next config ships a non-enforcing CSP observation policy", () => {
  const source = fs.readFileSync(path.join(process.cwd(), "apps/web/next.config.ts"), "utf8");
  assert.match(source, /key: "Content-Security-Policy-Report-Only"/);
  assert.match(source, /key: "Reporting-Endpoints"/);
  assert.doesNotMatch(source, /key: "Content-Security-Policy"\s*,/);
  assert.match(source, /frame-ancestors 'none'/);
  assert.match(source, /object-src 'none'/);
  assert.match(source, /report-uri \/api\/csp-report/);
  assert.match(source, /https:\/\/cdn\.jsdelivr\.net/);
  assert.match(source, /https:\/\/www\.googletagmanager\.com/);
});

test("CSP and client-error collectors have abuse controls", () => {
  for (const file of [
    "apps/web/src/app/api/csp-report/route.ts",
    "apps/web/src/app/api/monitoring/client-error/route.ts",
  ]) {
    const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    assert.match(source, /rateLimit\(/, `${file} has no rate limit`);
    assert.match(source, /content-length/i, `${file} has no body-size precheck`);
    assert.match(source, /MAX_[A-Z_]+_BYTES/, `${file} has no hard body cap`);
  }
});

test("server and client errors have safe global capture points", () => {
  const instrumentation = fs.readFileSync(
    path.join(process.cwd(), "apps", "web", "src", "instrumentation.ts"),
    "utf8"
  );
  assert.match(instrumentation, /Instrumentation\.onRequestError/);
  assert.match(instrumentation, /captureServerError/);

  for (const file of [
    "apps/web/src/app/error.tsx",
    "apps/web/src/app/global-error.tsx",
    "apps/web/src/app/admin/error.tsx",
  ]) {
    const source = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    assert.match(source, /^"use client";/);
    assert.match(source, /unstable_retry/);
    assert.match(source, /reportClientBoundaryError/);
    assert.doesNotMatch(source, /\{error\.message\}/);
  }
});

test("Stripe webhook failures are sent to operational monitoring", () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), "apps", "web", "src", "app", "api", "stripe", "webhook", "route.ts"),
    "utf8"
  );
  const captures = source.match(/captureServerError\(/g) ?? [];
  assert.ok(captures.length >= 4, "all material webhook failure paths must capture");
});

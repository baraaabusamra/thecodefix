// Single entry point for the automated test suite: `npm test`.
// Used identically by local development, run-ci.cmd and GitHub Actions, so
// there is exactly one definition of "the tests".
//
// Runs every tests/**/*.test.mjs file through tsx (TypeScript sources are
// imported directly) with node:test module mocking enabled. node:test runs
// each file in its own process, so per-file mock.module() calls stay isolated.
//
//   npm test                    → all tests
//   npm test -- tests/foo.test.mjs   → only the given files
//
// The browser-only Python sandbox proof (npm run verify:python-sandbox) is
// NOT part of this suite: it needs a Chromium browser plus internet access to
// cdn.jsdelivr.net. Its structural guard (tests/python-sandbox.test.mjs) is.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

// mock.module() must also intercept modules tsx loads as CommonJS; Node 22
// doesn't support that (143 tests fail there), Node 24 does. CI pins 24 via
// .nvmrc. This concerns the TEST runtime only, not the production runtime.
const major = Number(process.versions.node.split(".")[0]);
if (major < 24) {
  console.error(`npm test requires Node >= 24 (running ${process.versions.node}). See .nvmrc.`);
  process.exit(1);
}

const root = process.cwd();
const requested = process.argv.slice(2);

function findTests(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...findTests(p));
    else if (entry.name.endsWith(".test.mjs")) out.push(path.relative(root, p));
  }
  return out.sort();
}

const files = requested.length ? requested : findTests(path.join(root, "tests"));
if (files.length === 0) {
  console.error("No test files found.");
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--experimental-test-module-mocks", "--test", ...files],
  { stdio: "inherit", cwd: root }
);
process.exit(result.status ?? 1);

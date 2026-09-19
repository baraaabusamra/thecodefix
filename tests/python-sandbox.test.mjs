import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { PY_SANDBOX_SRCDOC } from "../src/lib/python-sandbox.ts";

// Structural guard for the Python playground isolation boundary. The real
// behavioural proof runs in a browser: `npm run verify:python-sandbox`
// (scripts/verify-python-sandbox.mjs) — it shows the old same-origin worker
// sending the session cookie on every channel and the sandbox sending none.

// Code only: drop block comments and whole-line // comments, so explanatory
// comments that mention the forbidden patterns don't count.
const stripComments = (text) =>
  text
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
const read = (f) => stripComments(fs.readFileSync(path.join(process.cwd(), f), "utf8"));

test("Playground never starts a same-origin Worker for student code", () => {
  const src = read("src/components/Playground.tsx");
  assert.doesNotMatch(src, /new Worker\(/);
  assert.match(src, /new SandboxedPythonWorker\("\/py-worker\.js"\)/);
});

test("no other client code starts the Python worker directly", () => {
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.(tsx?|jsx?|mjs)$/.test(entry.name)) {
        const text = stripComments(fs.readFileSync(p, "utf8"));
        if (/new Worker\(\s*["'`]\/py-worker\.js/.test(text)) offenders.push(p);
      }
    }
  };
  walk(path.join(process.cwd(), "src"));
  assert.deepStrictEqual(offenders, []);
});

test("the sandbox iframe gets scripts only — never same-origin, forms, popups or top navigation", () => {
  const src = read("src/lib/python-sandbox.ts");
  const sandboxAttrs = [...src.matchAll(/setAttribute\("sandbox", "([^"]*)"\)/g)].map((m) => m[1]);
  assert.deepStrictEqual(sandboxAttrs, ["allow-scripts"]);
  assert.doesNotMatch(src, /allow-same-origin|allow-top-navigation|allow-popups|allow-forms/);
});

test("the parent only accepts messages from its own sandbox frame", () => {
  const src = read("src/lib/python-sandbox.ts");
  assert.match(src, /e\.source !== this\.frame\.contentWindow/);
});

test("the sandbox document only accepts messages from its parent and creates the worker from a Blob", () => {
  assert.match(PY_SANDBOX_SRCDOC, /if \(e\.source !== parent\) return;/);
  assert.match(PY_SANDBOX_SRCDOC, /new Worker\(url\)/);
  assert.match(PY_SANDBOX_SRCDOC, /URL\.createObjectURL\(new Blob\(/);
  // The sandbox must not fetch anything from the site origin itself.
  assert.doesNotMatch(PY_SANDBOX_SRCDOC, /fetch\(/);
});

test("terminate() removes the frame (which destroys the worker and any runaway loop)", () => {
  const src = read("src/lib/python-sandbox.ts");
  const body = src.slice(src.indexOf("terminate() {"));
  assert.match(body, /this\.frame\?\.remove\(\)/);
  assert.match(body, /removeEventListener\("message", this\.listener\)/);
});

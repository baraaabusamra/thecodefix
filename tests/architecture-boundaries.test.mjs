import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";

// Architecture boundaries (Phase 2).
//
// The repository has four source layers and one intended direction:
//
//     src/app  ->  src/components  ->  src/lib  ->  src/db / src/types
//
// Every rule below already held when it was written — none of them is a
// wish. They are here so that the direction survives the next hundred
// commits, because a boundary that only lives in a document is not a
// boundary. `npm run typecheck` cannot catch any of this: every violation
// they describe compiles perfectly.
//
// The one deliberate exception is the Next.js Server Action seam. A client
// component importing `@/app/.../actions` is the framework's own pattern —
// the import is replaced by an RPC stub, so it is not really a dependency on
// route code. That is allowed, but ONLY for modules that carry "use server";
// importing anything else out of src/app into src/lib is a genuine inversion.

const ROOT = process.cwd();
const SRC = path.join(ROOT, "src");

const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");

function sourceFiles() {
  const out = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
    }
  };
  walk(SRC);
  return out.sort();
}

const CANDIDATE_EXT = [".ts", ".tsx", "/index.ts", "/index.tsx", ".d.ts"];

function resolveSpecifier(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null; // node_modules / bare specifier
  for (const ext of CANDIDATE_EXT) {
    const candidate = base + ext;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return rel(candidate);
    }
  }
  return null;
}

// Captures `import ... from "x"`, `export ... from "x"` and `import("x")`.
// Group 1 is set when the statement is `import type` / `export type`, which
// the compiler erases — those are not runtime dependencies.
const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)(\s+type)?([^;\n]*?)from\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;

/**
 * @param {"runtime"|"all"} kind  "runtime" drops erased type-only imports.
 */
function buildGraph(kind) {
  const graph = new Map();
  const directive = new Map();
  for (const file of sourceFiles()) {
    const source = fs.readFileSync(file, "utf8");
    const key = rel(file);
    directive.set(
      key,
      /^\s*["']use server["']/.test(source) ? "server"
        : /^\s*["']use client["']/.test(source) ? "client"
        : "none"
    );
    const deps = new Set();
    for (const m of source.matchAll(IMPORT_RE)) {
      const spec = m[3] ?? m[4];
      if (!spec) continue;
      if (kind === "runtime" && m[1]) continue;
      const resolved = resolveSpecifier(spec, file);
      if (resolved) deps.add(resolved);
    }
    graph.set(key, [...deps]);
  }
  return { graph, directive };
}

const { graph, directive } = buildGraph("all");
const runtime = buildGraph("runtime");

const layerOf = (f) =>
  f.startsWith("src/app/") ? "app"
  : f.startsWith("src/components/") ? "components"
  : f.startsWith("src/lib/") ? "lib"
  : f.startsWith("src/db") ? "db"
  : f.startsWith("src/types") ? "types"
  : "root";

function violations(predicate) {
  const bad = [];
  for (const [file, deps] of graph) {
    for (const dep of deps) if (predicate(file, dep)) bad.push(`${file} -> ${dep}`);
  }
  return bad.sort();
}

test("the graph actually resolved (guards against a vacuously passing suite)", () => {
  assert.ok(graph.size > 250, `only ${graph.size} source files walked`);
  const edges = [...graph.values()].reduce((n, d) => n + d.length, 0);
  assert.ok(edges > 500, `only ${edges} internal imports resolved`);
});

test("src/db is a leaf: it imports no application code", () => {
  assert.deepStrictEqual(
    violations(
      (f, d) => layerOf(f) === "db" && ["app", "components", "lib"].includes(layerOf(d))
    ),
    [],
    "the schema and database client must not depend on features or UI — " +
      "everything else points at them"
  );
});

test("src/lib does not import UI components", () => {
  assert.deepStrictEqual(
    violations((f, d) => layerOf(f) === "lib" && layerOf(d) === "components"),
    [],
    "src/lib is domain and infrastructure code; pulling a component into it " +
      "inverts the direction and drags React into non-UI modules"
  );
});

test("src/lib and src/components reach into src/app only through Server Actions", () => {
  assert.deepStrictEqual(
    violations(
      (f, d) =>
        ["lib", "components"].includes(layerOf(f)) &&
        layerOf(d) === "app" &&
        directive.get(d) !== "server"
    ),
    [],
    'importing a route module out of src/app is an inversion. Only "use ' +
      'server" action modules may be imported this way — that import is an ' +
      "RPC boundary, not a dependency on route code."
  );
});

test("src/types imports no application code", () => {
  assert.deepStrictEqual(
    violations((f, d) => layerOf(f) === "types" && ["app", "components"].includes(layerOf(d))),
    [],
    "ambient type declarations must stay at the bottom of the graph"
  );
});

test("there are no import cycles anywhere in src/", () => {
  const state = new Map();
  const trail = [];
  const found = new Set();
  function visit(node) {
    if (state.get(node) === "done") return;
    if (state.get(node) === "open") {
      const start = trail.indexOf(node);
      found.add([...trail.slice(start), node].join(" -> "));
      return;
    }
    state.set(node, "open");
    trail.push(node);
    for (const dep of graph.get(node) ?? []) visit(dep);
    trail.pop();
    state.set(node, "done");
  }
  for (const node of graph.keys()) visit(node);

  assert.deepStrictEqual(
    [...found],
    [],
    "a cycle makes module initialisation order load-bearing and is a common " +
      "source of undefined-at-import-time bugs"
  );
});

// ── Server-only boundary ────────────────────────────────────────────────
//
// Anything a "use client" module imports is compiled into the browser
// bundle. These modules must never end up there. Today each is reachable
// only through `import type`, which the compiler erases — flipping one of
// those to a value import would ship it, and nothing else in the build would
// complain. For src/lib/quiz-bank.ts specifically that means shipping the
// exam answer key to the client, which is the exact attack the server-graded
// assessment design exists to prevent.
const SERVER_ONLY = [
  "src/auth.ts",
  "src/db/index.ts",
  "src/db/schema.ts",
  "src/lib/admin-access.ts",
  "src/lib/admin-token.ts",
  "src/lib/authorization.ts",
  "src/lib/crypto.ts",
  "src/lib/exam-policy.ts",
  "src/lib/quiz-bank.ts",
  "src/lib/stripe.ts",
  "src/lib/stripe-sync.ts",
  "src/lib/trusted-stats.ts",
];

test("the server-only module list still matches real files", () => {
  const missing = SERVER_ONLY.filter((f) => !fs.existsSync(path.join(ROOT, f)));
  assert.deepStrictEqual(
    missing,
    [],
    "a module on the server-only list no longer exists — if it moved, move " +
      "this entry too, or the protection silently stops covering it"
  );
});

test("no server-only module is reachable from a client bundle", () => {
  const clientEntries = [...runtime.graph.keys()].filter(
    (f) => runtime.directive.get(f) === "client"
  );
  assert.ok(clientEntries.length > 20, `only ${clientEntries.length} client modules found`);

  const leaks = [];
  for (const entry of clientEntries) {
    const seen = new Set();
    const stack = [[entry, [entry]]];
    while (stack.length) {
      const [node, trail] = stack.pop();
      if (seen.has(node)) continue;
      seen.add(node);
      if (node !== entry && SERVER_ONLY.includes(node)) {
        leaks.push(trail.join("\n       -> "));
        continue;
      }
      for (const dep of runtime.graph.get(node) ?? []) {
        // A "use server" module is an RPC boundary: Next replaces the import
        // with a stub, so its own imports do not reach the browser.
        if (runtime.directive.get(dep) === "server") continue;
        stack.push([dep, [...trail, dep]]);
      }
    }
  }

  assert.deepStrictEqual(
    [...new Set(leaks)],
    [],
    "a client component can now pull a server-only module into the browser " +
      "bundle. If the import is only for a type, write it as `import type` " +
      "so the compiler erases it."
  );
});

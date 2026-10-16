import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { PACKAGES } from "../scripts/v2/layout.mjs";
import { sourceFiles } from "./helpers/source-roots.mjs";

// Architecture boundaries (V2 monorepo).
//
//   apps/web  ─►  modules/*  ─►  packages/*
//      (routes)    (features)     (foundations)
//
// Dependencies point one way. A rule only lives here once it already holds,
// so the suite protects the shape against the next hundred commits —
// `npm run typecheck` cannot catch any of this: every violation compiles.
// See docs/v2/ARCHITECTURE.md §3 and docs/v2/adr/0002-modules.md.

const ROOT = process.cwd();
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const files = sourceFiles(/\.(ts|tsx)$/);
const fileSet = new Set(files);

const pkgOf = (f) => {
  for (const [name, { dir }] of Object.entries(PACKAGES)) if (f.startsWith(dir + "/")) return name;
  return null;
};
const roleOf = (name) => PACKAGES[name]?.role ?? null;

const CANDIDATE_EXT = ["", ".ts", ".tsx", "/index.ts", "/index.tsx", ".d.ts"];
function resolveSpecifier(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = "apps/web/src/" + spec.slice(2);
  else if (spec.startsWith("@tcf/")) {
    const [scope, name, ...rest] = spec.split("/");
    const info = PACKAGES[`${scope}/${name}`];
    if (!info) return null;
    base = rest.length ? `${info.dir}/src/${rest.join("/")}` : `${info.dir}/src/index`;
  } else if (spec.startsWith(".")) base = rel(path.resolve(path.dirname(fromFile), spec));
  else return null;
  for (const ext of CANDIDATE_EXT) if (fileSet.has(base + ext)) return base + ext;
  return null;
}

// `import … from "x"`, `export … from "x"`, `import("x")`. Group 1 marks
// `import type` / `export type`, which the compiler erases.
const IMPORT_RE =
  /(?:^|\n)\s*(?:import|export)(\s+type)?([^;\n]*?)from\s+["']([^"']+)["']|import\s*\(\s*["']([^"']+)["']\s*\)/g;

function buildGraph(kind) {
  const graph = new Map();
  const directive = new Map();
  const specs = new Map();
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    directive.set(file, /^\s*["']use server["']/.test(source) ? "server" : /^\s*["']use client["']/.test(source) ? "client" : "none");
    const deps = new Set();
    const raw = [];
    for (const m of source.matchAll(IMPORT_RE)) {
      const spec = m[3] ?? m[4];
      if (!spec) continue;
      raw.push(spec);
      if (kind === "runtime" && m[1]) continue;
      const resolved = resolveSpecifier(spec, file);
      if (resolved) deps.add(resolved);
    }
    graph.set(file, [...deps]);
    specs.set(file, raw);
  }
  return { graph, directive, specs };
}

const { graph, specs } = buildGraph("all");
const runtime = buildGraph("runtime");

function violations(predicate) {
  const bad = [];
  for (const [file, deps] of graph) for (const dep of deps) if (predicate(file, dep)) bad.push(`${file} -> ${dep}`);
  return bad.sort();
}

/** Package-level edges actually present: "@tcf/a" -> Set("@tcf/b", …) */
function packageEdges() {
  const edges = new Map();
  for (const [file, deps] of graph) {
    const a = pkgOf(file);
    if (!a) continue;
    for (const dep of deps) {
      const b = pkgOf(dep);
      if (b && b !== a) (edges.get(a) ?? edges.set(a, new Set()).get(a)).add(b);
    }
  }
  return edges;
}

// ── Allowed edges ──────────────────────────────────────────────────────
// Foundations form their own small DAG. Adding an edge here is an
// architectural decision: record it in docs/v2/adr/ with the reason.
const FOUNDATION_DEPS = {
  "@tcf/core": [],
  "@tcf/db": [],
  "@tcf/contracts": [],
  "@tcf/observability": ["@tcf/core"],
  "@tcf/identity": ["@tcf/core", "@tcf/db"],
  "@tcf/content": ["@tcf/db", "@tcf/core"],
  "@tcf/ui": ["@tcf/core", "@tcf/observability"],
};

// Feature modules may use any foundation. Module → module edges are rare
// and allow-listed; the module graph must stay acyclic.
const MODULE_DEPS = {
  "@tcf/learning": ["@tcf/progress"],
  "@tcf/progress": [],
  "@tcf/assessment": ["@tcf/progress"],
  "@tcf/certificates": ["@tcf/assessment", "@tcf/progress"],
  "@tcf/billing": [],
  "@tcf/creators": [],
  "@tcf/academic": ["@tcf/jobs"],
  "@tcf/jobs": [],
  "@tcf/feedback": [],
  "@tcf/media": [],
  // The back office composes domain modules; no domain module may import it.
  "@tcf/admin": ["@tcf/assessment", "@tcf/progress"],
};

test("the graph actually resolved (guards against a vacuously passing suite)", () => {
  assert.ok(graph.size > 250, `only ${graph.size} source files walked`);
  const edges = [...graph.values()].reduce((n, d) => n + d.length, 0);
  assert.ok(edges > 500, `only ${edges} internal imports resolved`);
  assert.ok(packageEdges().size > 10, "package-level edges did not resolve");
});

test("foundation packages never import feature modules or apps", () => {
  assert.deepStrictEqual(
    violations((f, d) => roleOf(pkgOf(f)) === "foundation" && ["module", "app"].includes(roleOf(pkgOf(d)))),
    [],
    "packages/* sit at the bottom of the graph; a foundation that knows about a feature cannot be reused by the API, the mobile app or another module"
  );
});

test("feature modules never import the web app", () => {
  assert.deepStrictEqual(
    violations((f, d) => roleOf(pkgOf(f)) === "module" && pkgOf(d) === "@tcf/web"),
    [],
    "modules/* must work for any app (web, admin, API). Route code depends on modules, never the reverse — move the shared code into the module"
  );
});

test("only the web app uses the @/ alias", () => {
  const bad = [];
  for (const [file, raw] of specs) {
    if (pkgOf(file) === "@tcf/web") continue;
    for (const s of raw) if (s.startsWith("@/")) bad.push(`${file}: ${s}`);
  }
  assert.deepStrictEqual(bad, [], '"@/" means apps/web/src. Packages and modules import each other as "@tcf/<name>/…"');
});

test("foundation packages depend only on their allowed foundations", () => {
  const edges = packageEdges();
  const bad = [];
  for (const [name, allowed] of Object.entries(FOUNDATION_DEPS)) {
    for (const dep of edges.get(name) ?? []) if (!allowed.includes(dep)) bad.push(`${name} -> ${dep}`);
  }
  assert.deepStrictEqual(bad, [], "new foundation edge: decide it in an ADR, then add it to FOUNDATION_DEPS");
});

test("module-to-module dependencies are allow-listed", () => {
  const edges = packageEdges();
  const bad = [];
  for (const [name, { role }] of Object.entries(PACKAGES)) {
    if (role !== "module") continue;
    const allowed = MODULE_DEPS[name];
    assert.ok(allowed, `${name} has no entry in MODULE_DEPS`);
    for (const dep of edges.get(name) ?? []) if (roleOf(dep) === "module" && !allowed.includes(dep)) bad.push(`${name} -> ${dep}`);
  }
  assert.deepStrictEqual(bad, [], "a module now depends on another module. Prefer moving the shared piece into a foundation; otherwise record the edge in an ADR and MODULE_DEPS");
});

test("no domain module imports the back office", () => {
  assert.deepStrictEqual(
    violations((f, d) => roleOf(pkgOf(f)) === "module" && pkgOf(f) !== "@tcf/admin" && pkgOf(d) === "@tcf/admin"),
    []
  );
});

test("the package graph is acyclic", () => {
  const edges = packageEdges();
  const state = new Map();
  const cycles = [];
  const visit = (n, trail) => {
    if (state.get(n) === "done") return;
    if (state.get(n) === "open") return cycles.push([...trail.slice(trail.indexOf(n)), n].join(" -> "));
    state.set(n, "open");
    for (const d of edges.get(n) ?? []) visit(d, [...trail, n]);
    state.set(n, "done");
  };
  for (const n of edges.keys()) visit(n, []);
  assert.deepStrictEqual(cycles, [], "packages that depend on each other cannot be built, tested or extracted separately");
});

test("every cross-package import is declared in package.json", () => {
  const bad = [];
  for (const [a, deps] of packageEdges()) {
    const pj = JSON.parse(fs.readFileSync(path.join(PACKAGES[a].dir, "package.json"), "utf8"));
    for (const b of deps) if (!pj.dependencies?.[b]) bad.push(`${a} uses ${b} but does not declare it`);
  }
  assert.deepStrictEqual(bad, [], "run `npm run workspaces:sync`");
});

test("there are no import cycles between files", () => {
  const state = new Map();
  const trail = [];
  const found = new Set();
  function visit(node) {
    if (state.get(node) === "done") return;
    if (state.get(node) === "open") {
      found.add([...trail.slice(trail.indexOf(node)), node].join(" -> "));
      return;
    }
    state.set(node, "open");
    trail.push(node);
    for (const dep of graph.get(node) ?? []) visit(dep);
    trail.pop();
    state.set(node, "done");
  }
  for (const node of graph.keys()) visit(node);
  assert.deepStrictEqual([...found], [], "a cycle makes module initialisation order load-bearing");
});

// ── Server-only boundary ────────────────────────────────────────────────
// Anything a "use client" module imports is compiled into the browser bundle.
// These must never end up there. For quiz-bank.ts that would ship the exam
// answer key to the client — the exact attack server-graded exams prevent.
const SERVER_ONLY = [
  "packages/identity/src/auth.ts",
  "packages/db/src/index.ts",
  "packages/db/src/schema.ts",
  "packages/db/src/transaction.ts",
  "packages/identity/src/admin-access.ts",
  "packages/identity/src/admin-token.ts",
  "packages/identity/src/authorization.ts",
  "packages/core/src/crypto.ts",
  "modules/assessment/src/exam-policy.ts",
  "modules/assessment/src/quiz-bank.ts",
  "modules/billing/src/stripe.ts",
  "modules/billing/src/stripe-sync.ts",
  "modules/progress/src/trusted-stats.ts",
];

test("the server-only module list still matches real files", () => {
  const missing = SERVER_ONLY.filter((f) => !fs.existsSync(path.join(ROOT, f)));
  assert.deepStrictEqual(missing, [], "a server-only module moved — move this entry too, or the protection silently stops");
});

test("no server-only module is reachable from a client bundle", () => {
  const clientEntries = [...runtime.graph.keys()].filter((f) => runtime.directive.get(f) === "client");
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
        // "use server" modules are RPC boundaries: Next replaces the import with a stub.
        if (runtime.directive.get(dep) === "server") continue;
        stack.push([dep, [...trail, dep]]);
      }
    }
  }
  assert.deepStrictEqual([...new Set(leaks)], [], "a client component can now pull a server-only module into the browser. Type-only imports must be written `import type`.");
});

test("every package and module documents where it sits on the map", () => {
  const missing = [];
  for (const [name, { dir }] of Object.entries(PACKAGES)) {
    for (const f of ["README.md", "MAP.svg"]) if (!fs.existsSync(path.join(dir, f))) missing.push(`${name}: ${f}`);
  }
  assert.deepStrictEqual(missing, [], "run `npm run map` — it writes each package's README map section and MAP.svg");
});

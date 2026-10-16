import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import * as schema from "../packages/db/src/schema.ts";

// Phase 2 split src/db/schema.ts (1,148 lines) into domain modules under
// src/db/schema/. That was a CODE ORGANIZATION change only — no table,
// column, SQL type, default, index, constraint or enum value moved with it.
//
// These tests are the guard rails for that claim:
//   1. the barrel still re-exports every symbol the modules define, so
//      `@/db/schema` stays the one import path for the whole app;
//   2. the barrel survives the tsx/CommonJS round trip the test runner uses —
//      `export *` does NOT, and silently yields an empty namespace, which
//      would quietly empty the PGlite helpers instead of failing loudly;
//   3. the physical SQL table names are locked, so re-shuffling modules can
//      never silently rename a table (which WOULD need a migration);
//   4. the modules stay acyclic, so the split keeps a readable dependency
//      direction instead of becoming eleven mutually-recursive files.

const DB_DIR = path.join(process.cwd(), "packages", "db", "src");
const SCHEMA_DIR = path.join(DB_DIR, "schema");
const barrelSource = fs.readFileSync(path.join(DB_DIR, "schema.ts"), "utf8");

const moduleFiles = fs
  .readdirSync(SCHEMA_DIR)
  .filter((f) => f.endsWith(".ts"))
  .sort();

// The exact set of physical table names as of the Phase 2 split. Adding a
// table here is expected when a real product change ships a migration.
// Changing or removing one means an existing table was renamed or dropped —
// that is a schema change and must never come out of a refactor.
const TABLE_NAMES = [
  "academic_study_plan",
  "account",
  "audit_log",
  "certificate",
  "content_lesson",
  "content_track",
  "creator",
  "exam_attempt",
  "instructor",
  "instructor_track",
  "job_alert",
  "league_snapshot",
  "lesson_completion",
  "lesson_quiz_attempt",
  "notification",
  "organization",
  "organization_member",
  "outreach_contact",
  "pipeline_collection_job",
  "pipeline_course",
  "pipeline_course_prerequisite",
  "pipeline_curriculum_course",
  "pipeline_curriculum_version",
  "pipeline_document",
  "pipeline_extraction_evidence",
  "pipeline_extraction_run",
  "pipeline_program",
  "pipeline_review_queue",
  "pipeline_source",
  "pipeline_university",
  "post",
  "seo_keyword",
  "session",
  "stripe_event",
  "subscription",
  "suggestion",
  "ticket",
  "ticket_reply",
  "user",
  "user_progress",
  // Not `verification_token`: the Auth.js adapter names this one in camelCase
  // and the migrations agree (drizzle/*.sql). Left exactly as-is.
  "verificationToken",
  "work_report",
];

/** Every `export const` / `export type` declared across the domain modules. */
function declaredSymbols() {
  const out = [];
  for (const file of moduleFiles) {
    const source = fs.readFileSync(path.join(SCHEMA_DIR, file), "utf8");
    for (const m of source.matchAll(/^export (const|type) (\w+)/gm)) {
      out.push({ kind: m[1], name: m[2], file });
    }
  }
  return out;
}

/** Every name the barrel re-exports, regardless of formatting. */
function reExportedNames() {
  const names = new Set();
  for (const m of barrelSource.matchAll(
    /export\s+(?:type\s+)?\{([^}]*)\}\s+from\s+"\.\/schema\/[\w-]+";/g
  )) {
    for (const raw of m[1].split(",")) {
      const name = raw.trim();
      if (name) names.add(name);
    }
  }
  return names;
}

test("the barrel re-exports every symbol the domain modules declare", () => {
  const declared = declaredSymbols();
  const exported = reExportedNames();

  assert.ok(declared.length > 0, "no exports found under src/db/schema/");

  const missing = declared
    .filter(({ name }) => !exported.has(name))
    .map(({ file, name }) => `${file}:${name}`);

  assert.deepStrictEqual(
    missing,
    [],
    "declared in a domain module but not re-exported from src/db/schema.ts — " +
      "callers importing from @/db/schema would not see these"
  );

  const orphans = [...exported].filter(
    (name) => !declared.some((d) => d.name === name)
  );
  assert.deepStrictEqual(
    orphans,
    [],
    "re-exported from src/db/schema.ts but no longer declared anywhere"
  );
});

test("the barrel does not use star re-exports (they break under tsx/CJS)", () => {
  // Compare against the code only: this file's own header explains the rule
  // by quoting the very syntax it forbids.
  const code = barrelSource
    .split("\n")
    .map((line) => {
      const i = line.indexOf("//");
      return i === -1 ? line : line.slice(0, i);
    })
    .join("\n");

  assert.ok(
    !/export\s+\*\s+from/.test(code),
    "src/db/schema.ts uses `export *`. The test runner loads TypeScript " +
      "through tsx, which compiles it to CommonJS, and star re-exports do " +
      "not survive that: `import * as schema` comes back empty and the " +
      "PGlite helpers silently get no tables. Spell the names out instead."
  );
});

test("value exports are actually reachable through @/db/schema at runtime", () => {
  // The regression this pins down is an *empty* namespace, which every other
  // assertion in this file would pass over happily.
  const declaredValues = declaredSymbols().filter((d) => d.kind === "const");
  const unreachable = declaredValues
    .filter(({ name }) => schema[name] === undefined)
    .map(({ file, name }) => `${file}:${name}`);

  assert.deepStrictEqual(
    unreachable,
    [],
    "these are exported by a domain module but come back undefined when " +
      "importing the barrel — the re-export is not surviving the module round trip"
  );
  assert.ok(
    declaredValues.length >= 40,
    `expected the barrel to expose the tables and enums, saw ${declaredValues.length}`
  );
});

test("physical table names are unchanged by the module split", () => {
  // Drizzle's own `is()` helper compares entity kinds through class identity,
  // which fails here: tsx loads drizzle-orm as both ESM and CJS, so the
  // classes are not the same objects. The registered global symbols are
  // stable across both instances.
  const IS_TABLE = Symbol.for("drizzle:IsDrizzleTable");
  const TABLE_NAME = Symbol.for("drizzle:Name");

  const found = [];
  for (const value of Object.values(schema)) {
    if (value && value[IS_TABLE]) found.push(value[TABLE_NAME]);
  }
  found.sort();

  assert.deepStrictEqual(
    found,
    TABLE_NAMES,
    "the set of SQL table names changed — a refactor must never do this; a " +
      "real product change that adds a table also ships a migration and " +
      "updates this list"
  );
});

test("schema modules have no import cycles", () => {
  const graph = new Map();
  for (const file of moduleFiles) {
    const name = file.replace(/\.ts$/, "");
    const source = fs.readFileSync(path.join(SCHEMA_DIR, file), "utf8");
    const deps = [
      ...source.matchAll(/^import .*? from "\.\/([\w-]+)";$/gm),
    ].map((m) => m[1]);
    graph.set(name, deps);
  }

  const state = new Map();
  const trail = [];
  function visit(node) {
    if (state.get(node) === "done") return;
    if (state.get(node) === "open") {
      assert.fail(
        `import cycle between schema modules: ${[...trail, node].join(" -> ")}`
      );
    }
    state.set(node, "open");
    trail.push(node);
    for (const dep of graph.get(node) ?? []) visit(dep);
    trail.pop();
    state.set(node, "done");
  }
  for (const node of graph.keys()) visit(node);

  // auth.ts owns `users`; every other domain references it, so an import out
  // of auth.ts is a cycle waiting to happen.
  assert.deepStrictEqual(
    graph.get("auth"),
    [],
    "src/db/schema/auth.ts must stay a leaf"
  );
});

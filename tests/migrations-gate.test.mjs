import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import {
  checkMigrationSet,
  compareAppliedToJournal,
  destructiveStatements,
  readJournal,
} from "../scripts/lib/migrations.mjs";

// Deployment-safe migrations: integrity of the committed set, immutability of
// historical migrations, destructive-SQL detection, ledger comparison, and —
// on a real Postgres — all-or-nothing application of pending migrations.

function copyMigrations() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tcf-migrations-"));
  fs.cpSync("packages/db/drizzle", dir, { recursive: true });
  return dir;
}

test("the committed migration set is consistent and fully locked", () => {
  assert.deepStrictEqual(checkMigrationSet(), []);
});

test("editing an already-committed migration is detected", () => {
  const dir = copyMigrations();
  fs.appendFileSync(path.join(dir, "0003_fuzzy_the_order.sql"), "\nALTER TABLE x ADD COLUMN y int;");
  const problems = checkMigrationSet(dir);
  assert.ok(problems.some((p) => p.includes("0003_fuzzy_the_order") && p.includes("modified")));
});

test("line-ending differences (git autocrlf) are not treated as edits", () => {
  const dir = copyMigrations();
  const file = path.join(dir, "0003_fuzzy_the_order.sql");
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace(/\r?\n/g, "\r\n"));
  assert.deepStrictEqual(checkMigrationSet(dir), []);
});

test("unlocked, stray and deleted migrations are detected", () => {
  const dir = copyMigrations();
  fs.writeFileSync(path.join(dir, "9999_stray.sql"), "SELECT 1;");
  const lock = JSON.parse(fs.readFileSync(path.join(dir, "migrations.lock.json"), "utf8"));
  const [firstTag] = Object.keys(lock);
  lock.ghost_migration = "abc";
  delete lock[firstTag];
  fs.writeFileSync(path.join(dir, "migrations.lock.json"), JSON.stringify(lock));
  const problems = checkMigrationSet(dir).join("\n");
  assert.match(problems, /9999_stray\.sql is not in the journal/);
  assert.match(problems, new RegExp(`${firstTag} is not in migrations\\.lock\\.json`));
  assert.match(problems, /ghost_migration has no journal entry/);
});

test("destructive SQL is detected; additive SQL and comments are not", () => {
  for (const sql of [
    'DROP TABLE "x";',
    'ALTER TABLE "x" DROP COLUMN "y";',
    "TRUNCATE x;",
    'DELETE FROM "x" WHERE 1=1;',
    'ALTER TABLE "x" ALTER COLUMN "y" SET DATA TYPE numeric;',
    'ALTER TABLE "x" RENAME COLUMN "a" TO "b";',
    'ALTER TABLE "x" ALTER COLUMN "y" SET NOT NULL;',
  ]) {
    assert.ok(destructiveStatements(sql).length > 0, sql);
  }
  assert.deepStrictEqual(destructiveStatements('CREATE TABLE "x" ("id" text);\n-- DROP TABLE y in a comment'), []);
  assert.deepStrictEqual(
    destructiveStatements(fs.readFileSync("packages/db/drizzle/0027_stripe-webhook-idempotency.sql", "utf8")),
    []
  );
});

test("ledger comparison reports pending and unknown migrations", () => {
  const journal = readJournal();
  const all = journal.entries.map((e) => ({ created_at: String(e.when) }));
  assert.equal(compareAppliedToJournal(journal, all).upToDate, true);
  const r = compareAppliedToJournal(journal, all.slice(0, -1).concat([{ created_at: "1" }]));
  assert.deepStrictEqual(r.pending, [journal.entries.at(-1).tag]);
  assert.deepStrictEqual(r.unknown, [1]);
  assert.equal(r.upToDate, false);
});

test("pending migrations apply all-or-nothing: a failure rolls back every pending one", async () => {
  const client = new PGlite();
  const db = drizzle(client);
  await migrate(db, { migrationsFolder: "packages/db/drizzle" });
  const before = (await client.query("select count(*)::int n from drizzle.__drizzle_migrations")).rows[0].n;

  const dir = copyMigrations();
  const journal = readJournal(dir);
  const last = journal.entries.at(-1);
  const add = (idx, tag, sql) => {
    journal.entries.push({ ...last, idx, tag, when: last.when + idx });
    fs.writeFileSync(path.join(dir, `${tag}.sql`), sql);
  };
  add(journal.entries.length, "9001_good", 'CREATE TABLE "phase1_probe" ("id" text PRIMARY KEY);');
  add(journal.entries.length, "9002_broken", "THIS IS NOT SQL;");
  fs.writeFileSync(path.join(dir, "meta", "_journal.json"), JSON.stringify(journal));

  await assert.rejects(migrate(db, { migrationsFolder: dir }));
  const probe = await client.query("select to_regclass('public.phase1_probe') as t");
  assert.equal(probe.rows[0].t, null, "the good migration before the broken one must be rolled back");
  const after = (await client.query("select count(*)::int n from drizzle.__drizzle_migrations")).rows[0].n;
  assert.equal(after, before, "the ledger must not record a partially applied set");
});

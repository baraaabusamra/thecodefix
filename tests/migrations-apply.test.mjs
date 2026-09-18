import test from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import { createTestDb } from "./helpers/pglite.mjs";

// Every committed migration must apply cleanly, in order, to an empty
// Postgres — the same path a fresh production/staging database takes.

test("all committed migrations apply to an empty Postgres database", async () => {
  const journal = JSON.parse(fs.readFileSync("drizzle/meta/_journal.json", "utf8"));
  const { client } = await createTestDb();
  const applied = await client.query('select count(*)::int as n from drizzle.__drizzle_migrations');
  assert.equal(applied.rows[0].n, journal.entries.length);
});

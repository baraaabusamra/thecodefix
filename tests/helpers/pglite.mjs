// Real-Postgres test database: PGlite (Postgres compiled to WASM, in-process)
// with every committed Drizzle migration applied — the same SQL production
// runs. Lets tests assert database invariants (unique/partial indexes,
// conditional UPDATEs, conflict handling) instead of trusting mocks.
//
// Usage inside a test file (before importing app modules):
//   const { db } = await createTestDb();
//   mock.module("@/db", { exports: dbModuleExports(db) });

import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import * as schema from "../../packages/db/src/schema.ts";

export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "packages/db/drizzle" });
  return { client, db, schema };
}

/** Exports matching src/db/index.ts, backed by the test database. */
export function dbModuleExports(db) {
  return {
    db,
    schema,
    isDbEnabled: () => true,
    requireDb: () => db,
  };
}

let userSeq = 0;
/** Inserts a user row and returns its id. */
export async function createUser(db, overrides = {}) {
  const id = overrides.id ?? `user-${++userSeq}-${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(schema.users).values({
    id,
    email: `${id}@example.test`,
    name: overrides.name ?? id,
    role: overrides.role ?? "student",
  });
  return id;
}

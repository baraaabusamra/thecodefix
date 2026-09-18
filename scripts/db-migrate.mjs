// Production-safe migration runner:  npm run db:migrate:deploy -- --confirm
//
// - Transactional: uses the Neon WebSocket driver (neon-serverless), so
//   Drizzle applies ALL pending migrations in ONE transaction — a failure
//   rolls everything back; the schema is never left half-migrated. (The
//   neon-http driver used by the app has no transactions; never migrate
//   through it — see scripts/migrate-http.mjs.)
// - Explicit: requires --confirm and refuses to run inside a Vercel build,
//   so no preview (or production) deployment can migrate a database by
//   accident. Run it from the "Deploy production" workflow or by hand.
// - Guarded: a pending migration containing destructive SQL (DROP, TRUNCATE,
//   DELETE FROM, column type change, RENAME, SET NOT NULL) is refused unless
//   its tag is listed in ALLOW_DESTRUCTIVE_MIGRATIONS (comma-separated), i.e.
//   after a human review and, if needed, a maintenance window.
// - Verified: the migration set must pass the offline integrity check first,
//   and the database must report no pending migration afterwards.

import "dotenv/config";
import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { migrate } from "drizzle-orm/neon-serverless/migrator";
import {
  checkMigrationSet,
  compareAppliedToJournal,
  destructiveStatements,
  readJournal,
  readMigrationSql,
} from "./lib/migrations.mjs";

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

if (!process.argv.includes("--confirm")) {
  fail("Refusing to migrate without --confirm (migrations must be an explicit step).");
}
if (process.env.VERCEL === "1") {
  fail("Refusing to migrate inside a Vercel build. Run the Deploy production workflow instead.");
}
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) fail("DATABASE_URL_UNPOOLED (preferred) or DATABASE_URL is required.");

const problems = checkMigrationSet();
if (problems.length) fail("Migration set problems:\n - " + problems.join("\n - "));

neonConfig.webSocketConstructor = globalThis.WebSocket;
const pool = new Pool({ connectionString: url });

try {
  const journal = readJournal();
  const client = await pool.connect();
  let applied = [];
  try {
    const ledger = await client.query(
      `SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS exists`
    );
    if (ledger.rows[0].exists) {
      applied = (await client.query(`SELECT created_at FROM drizzle.__drizzle_migrations`)).rows;
    }
  } finally {
    client.release();
  }

  const { pending, unknown } = compareAppliedToJournal(journal, applied);
  if (unknown.length) {
    fail(`Database has migrations this commit doesn't know (${unknown.join(", ")}). Deploy the newer code instead.`);
  }
  if (pending.length === 0) {
    console.log("✓ No pending migrations.");
  } else {
    const allowed = new Set(
      (process.env.ALLOW_DESTRUCTIVE_MIGRATIONS ?? "").split(",").map((s) => s.trim()).filter(Boolean)
    );
    for (const tag of pending) {
      const found = destructiveStatements(readMigrationSql(tag));
      if (found.length && !allowed.has(tag)) {
        fail(
          `${tag} contains destructive SQL (${found.join(", ")}). Review it, plan a maintenance window if needed, ` +
            `then re-run with ALLOW_DESTRUCTIVE_MIGRATIONS=${tag}.`
        );
      }
    }
    console.log(`Applying ${pending.length} migration(s) in one transaction: ${pending.join(", ")}`);
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  }

  const after = (await pool.query(`SELECT created_at FROM drizzle.__drizzle_migrations`)).rows;
  const verify = compareAppliedToJournal(journal, after);
  if (!verify.upToDate) fail(`Post-migration verification failed: pending=${verify.pending.join(",")}`);
  console.log(`✓ Database is at ${verify.latest}.`);
} catch (error) {
  fail(`Migration failed and was rolled back: ${error instanceof Error ? error.message : error}`);
} finally {
  await pool.end();
}

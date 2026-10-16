import "dotenv/config";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";

// Applies pending drizzle migrations over the Neon HTTP driver.
// Usage: npm run db:migrate:http
//
// `drizzle-kit migrate` connects over a websocket, which some networks block.
// This script replays the same journal + bookkeeping (drizzle.__drizzle_migrations)
// so the two commands stay interchangeable. Statements run one-by-one (no
// transaction — the HTTP driver doesn't support them), matching how additive
// migrations behave; if one fails midway, rerunning skips completed entries.

// DEPRECATED for production: a failure midway leaves a PARTIALLY applied
// migration (no transaction). Use `npm run db:migrate:deploy -- --confirm`
// (scripts/db-migrate.mjs: transactional, guarded, verified). Kept only as an
// explicit last resort for networks that block WebSockets.
if (!process.argv.includes("--allow-non-transactional")) {
  console.error(
    "Refusing: this runner is not transactional. Use `npm run db:migrate:deploy -- --confirm`,\n" +
      "or pass --allow-non-transactional if you accept a possibly partial migration."
  );
  process.exit(1);
}

const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Provision the database first.");
  process.exit(1);
}
const sql = neon(url);

const journal = JSON.parse(readFileSync("packages/db/drizzle/meta/_journal.json", "utf8"));

await sql`CREATE SCHEMA IF NOT EXISTS "drizzle"`;
await sql`CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
  id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint
)`;
const applied = await sql`
  SELECT created_at FROM "drizzle"."__drizzle_migrations" ORDER BY created_at DESC LIMIT 1
`;
const lastApplied = applied.length ? Number(applied[0].created_at) : 0;

const pending = journal.entries.filter((e) => e.when > lastApplied);
if (pending.length === 0) {
  console.log("No pending migrations — database is up to date.");
  process.exit(0);
}

for (const entry of pending) {
  const file = readFileSync(`packages/db/drizzle/${entry.tag}.sql`, "utf8");
  const statements = file
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean);

  console.log(`Applying ${entry.tag} (${statements.length} statements)...`);
  for (const stmt of statements) {
    await sql.query(stmt);
  }
  const hash = createHash("sha256").update(file).digest("hex");
  await sql`
    INSERT INTO "drizzle"."__drizzle_migrations" (hash, created_at)
    VALUES (${hash}, ${entry.when})
  `;
  console.log(`  ✓ ${entry.tag} applied.`);
}
console.log("Done.");

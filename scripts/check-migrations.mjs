// Migration integrity gate.
//
//   npm run check:migrations      offline (CI): journal ↔ files ↔ snapshots,
//                                 and committed migrations are immutable
//                                 (drizzle/migrations.lock.json).
//   npm run db:verify             online: the target database has applied
//                                 exactly the committed migrations — nothing
//                                 pending, nothing unknown. Used by the deploy
//                                 workflow right before production promotion.
//   npm run db:lock-migrations    record hashes for newly generated migrations.

import "dotenv/config";
import {
  checkMigrationSet,
  compareAppliedToJournal,
  lockNewMigrations,
  readJournal,
} from "./lib/migrations.mjs";

const args = new Set(process.argv.slice(2));

if (args.has("--update-lock")) {
  const added = lockNewMigrations();
  console.log(added.length ? `Locked: ${added.join(", ")}` : "Lock file already up to date.");
  process.exit(0);
}

const problems = checkMigrationSet();
if (problems.length) {
  console.error("Migration set problems:\n - " + problems.join("\n - "));
  process.exit(1);
}
console.log(`Migration set OK (${readJournal().entries.length} migrations, all locked).`);

if (args.has("--db")) {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("--db needs DATABASE_URL_UNPOOLED or DATABASE_URL.");
    process.exit(1);
  }
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(url);
  const applied = await sql`
    SELECT created_at FROM "drizzle"."__drizzle_migrations"
  `.catch((error) => {
    console.error(`Cannot read the migration ledger: ${error.message}`);
    process.exit(1);
  });
  const result = compareAppliedToJournal(readJournal(), applied);
  if (!result.upToDate) {
    if (result.pending.length) console.error(`Pending (not applied): ${result.pending.join(", ")}`);
    if (result.unknown.length) {
      console.error(`Applied but not in this commit's journal: ${result.unknown.join(", ")}`);
    }
    process.exit(1);
  }
  console.log(`Database schema is at the latest migration: ${result.latest}`);
}

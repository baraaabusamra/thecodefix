// Shared, dependency-free helpers for migration safety (used by
// scripts/check-migrations.mjs, scripts/db-migrate.mjs and tests).

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const MIGRATIONS_DIR = "drizzle";
export const LOCK_FILE = path.join(MIGRATIONS_DIR, "migrations.lock.json");

export function readJournal(dir = MIGRATIONS_DIR) {
  return JSON.parse(fs.readFileSync(path.join(dir, "meta", "_journal.json"), "utf8"));
}

/** Migration SQL with line endings normalized (git autocrlf must not matter). */
export function readMigrationSql(tag, dir = MIGRATIONS_DIR) {
  return fs.readFileSync(path.join(dir, `${tag}.sql`), "utf8").replace(/\r\n/g, "\n");
}

export function hashSql(sqlText) {
  return crypto.createHash("sha256").update(sqlText.replace(/\r\n/g, "\n")).digest("hex");
}

// Statements that can lose data or break running code. A pending migration
// containing any of these is refused unless explicitly allowed by tag.
const DESTRUCTIVE = [
  [/\bDROP\s+(TABLE|COLUMN|SCHEMA|TYPE|VIEW|MATERIALIZED\s+VIEW)\b/i, "DROP"],
  [/\bTRUNCATE\b/i, "TRUNCATE"],
  [/\bDELETE\s+FROM\b/i, "DELETE FROM"],
  [/\bALTER\s+COLUMN\s+"?[\w]+"?\s+(SET\s+DATA\s+)?TYPE\b/i, "ALTER COLUMN TYPE"],
  [/\bRENAME\s+(COLUMN|TO)\b/i, "RENAME"],
  [/\bSET\s+NOT\s+NULL\b/i, "SET NOT NULL"],
];

export function destructiveStatements(sqlText) {
  // Ignore SQL line comments so explanations don't trigger the guard.
  const code = sqlText
    .split("\n")
    .filter((l) => !l.trim().startsWith("--") || l.includes("statement-breakpoint"))
    .join("\n");
  return DESTRUCTIVE.filter(([re]) => re.test(code)).map(([, label]) => label);
}

/**
 * Offline integrity check of the committed migration set. Returns a list of
 * problems (empty = OK):
 *   - every journal entry has its .sql file and snapshot;
 *   - no stray .sql file outside the journal;
 *   - every migration is recorded in migrations.lock.json with an unchanged
 *     hash — historical migrations are immutable.
 */
export function checkMigrationSet(dir = MIGRATIONS_DIR, lockFile = path.join(dir, "migrations.lock.json")) {
  const problems = [];
  const journal = readJournal(dir);
  const lock = fs.existsSync(lockFile) ? JSON.parse(fs.readFileSync(lockFile, "utf8")) : {};
  const tags = journal.entries.map((e) => e.tag);

  journal.entries.forEach((entry, i) => {
    if (entry.idx !== i) problems.push(`journal entry ${entry.tag} has idx ${entry.idx}, expected ${i}`);
    const sqlPath = path.join(dir, `${entry.tag}.sql`);
    if (!fs.existsSync(sqlPath)) {
      problems.push(`missing SQL file for ${entry.tag}`);
      return;
    }
    const snapshot = path.join(dir, "meta", `${entry.tag.split("_")[0]}_snapshot.json`);
    if (!fs.existsSync(snapshot)) problems.push(`missing snapshot for ${entry.tag}`);
    const hash = hashSql(readMigrationSql(entry.tag, dir));
    if (!lock[entry.tag]) {
      problems.push(`${entry.tag} is not in migrations.lock.json (run: npm run db:lock-migrations)`);
    } else if (lock[entry.tag] !== hash) {
      problems.push(`${entry.tag} was modified after being locked — never edit an existing migration; add a new one`);
    }
    if (i > 0 && entry.when <= journal.entries[i - 1].when) {
      problems.push(`${entry.tag} timestamp is not after the previous migration (would be skipped as already applied)`);
    }
  });

  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith(".sql") && !tags.includes(file.replace(/\.sql$/, ""))) {
      problems.push(`${file} is not in the journal`);
    }
  }
  for (const tag of Object.keys(lock)) {
    if (!tags.includes(tag)) problems.push(`lock entry ${tag} has no journal entry (a migration was deleted)`);
  }
  return problems;
}

/** Adds lock entries for new migrations. Never changes an existing entry. */
export function lockNewMigrations(dir = MIGRATIONS_DIR, lockFile = path.join(dir, "migrations.lock.json")) {
  const lock = fs.existsSync(lockFile) ? JSON.parse(fs.readFileSync(lockFile, "utf8")) : {};
  const added = [];
  for (const entry of readJournal(dir).entries) {
    if (!lock[entry.tag]) {
      lock[entry.tag] = hashSql(readMigrationSql(entry.tag, dir));
      added.push(entry.tag);
    }
  }
  fs.writeFileSync(lockFile, JSON.stringify(lock, null, 2) + "\n");
  return added;
}

/**
 * Compares the database's applied-migration ledger with the journal.
 * `applied` = rows of drizzle.__drizzle_migrations ({ created_at }).
 */
export function compareAppliedToJournal(journal, applied) {
  const appliedWhen = new Set(applied.map((r) => Number(r.created_at)));
  const journalWhen = new Set(journal.entries.map((e) => e.when));
  const pending = journal.entries.filter((e) => !appliedWhen.has(e.when)).map((e) => e.tag);
  const unknown = [...appliedWhen].filter((w) => !journalWhen.has(w));
  const latest = journal.entries.at(-1)?.tag ?? null;
  return { pending, unknown, latest, upToDate: pending.length === 0 && unknown.length === 0 };
}

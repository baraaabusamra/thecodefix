import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

// Database client. Stays dormant (null) until DATABASE_URL is set, mirroring
// the auth/payments flag pattern — the app builds and runs with no database.
// Provision Neon Postgres via the Vercel Marketplace, then set DATABASE_URL.
const url = process.env.DATABASE_URL;

export const db = url ? drizzle(neon(url), { schema }) : null;

export function isDbEnabled(): boolean {
  return !!process.env.DATABASE_URL;
}

/** Returns the db client or throws — use in code paths that require the DB. */
export function requireDb() {
  if (!db) {
    throw new Error(
      "Database not configured. Set DATABASE_URL to enable this feature."
    );
  }
  return db;
}

export { schema };

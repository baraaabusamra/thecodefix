import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Run from the repository root (npm run db:generate passes --config), so the
// paths below are root-relative.

export default defineConfig({
  schema: "./packages/db/src/schema.ts",
  out: "./packages/db/drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Only needed for migrate/push/studio; `generate` works offline.
    // Prefer the unpooled (direct) connection for DDL — the pgBouncer-pooled
    // URL can choke on migration transactions.
    url:
      process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
});

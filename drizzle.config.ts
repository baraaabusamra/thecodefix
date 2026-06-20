import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Only needed for migrate/push/studio; `generate` works offline.
    // Prefer the unpooled (direct) connection for DDL — the pgBouncer-pooled
    // URL can choke on migration transactions.
    url:
      process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
});

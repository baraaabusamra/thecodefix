// packages/db/src/transaction.ts
// 📍 خريطة: قبو البيانات ← كتابات ذرّية (كلها أو لا شيء)
//
// The default client (./index.ts) uses Neon over HTTP: fast, stateless, ideal
// for reads — but `db.transaction()` throws on that driver, so a multi-step
// write can half-complete (see docs/v2/adr/0004-database-transactions.md).
//
// `withTransaction` opens a short-lived WebSocket pool (the same driver
// scripts/db-migrate.mjs already uses for transactional migrations), runs the
// callback inside BEGIN/COMMIT, and always closes the pool. Use it for every
// write that must be atomic: subscription activation, payment bookkeeping,
// approve-and-audit, certificate issuance, curriculum persistence.
//
//   await withTransaction(async (tx) => {
//     await tx.update(posts).set({ status: "approved" }).where(eq(posts.id, id));
//     await tx.insert(auditLogs).values({ action: "post.approve", target: id });
//   });
//
// Adoption is per call site and tested one by one — V2 introduces the
// primitive; it does not silently change any existing write path.

import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle, type NeonDatabase } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

export type TransactionClient = Parameters<Parameters<NeonDatabase<typeof schema>["transaction"]>[0]>[0];

/** Run `work` atomically. Throws when DATABASE_URL is not configured. */
export async function withTransaction<T>(work: (tx: TransactionClient) => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (!url) throw new Error("Database not configured. Set DATABASE_URL to enable this feature.");
  if (typeof WebSocket !== "undefined" && !neonConfig.webSocketConstructor) {
    neonConfig.webSocketConstructor = WebSocket;
  }
  const pool = new Pool({ connectionString: url });
  try {
    const db = drizzle(pool, { schema });
    return await db.transaction(work);
  } finally {
    await pool.end();
  }
}

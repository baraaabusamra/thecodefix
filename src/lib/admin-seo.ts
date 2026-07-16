import { db } from "@/db";
import { seoKeywords } from "@/db/schema";
import { desc } from "drizzle-orm";
import type { SeoKeyword } from "@/db/schema";

// SEO keyword queries. Returns `null` when the database is off.
export async function listKeywords(): Promise<SeoKeyword[] | null> {
  if (!db) return null;
  return db.select().from(seoKeywords).orderBy(desc(seoKeywords.updatedAt));
}

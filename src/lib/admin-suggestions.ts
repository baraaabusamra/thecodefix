import { db } from "@/db";
import { suggestions } from "@/db/schema";
import { desc } from "drizzle-orm";
import type { Suggestion } from "@/db/schema";

// Suggestion queries for the admin panel. Returns `null` when the DB is off.
export async function listSuggestions(): Promise<Suggestion[] | null> {
  if (!db) return null;
  return db.select().from(suggestions).orderBy(desc(suggestions.createdAt));
}

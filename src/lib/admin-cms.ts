import { db } from "@/db";
import { contentTracks, contentLessons } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import type { ContentTrack, ContentLesson } from "@/db/schema";

// Admin-side CMS queries (include unpublished rows + ids, unlike the public
// readers in content.ts). Return empty/null when the DB is off.

export async function listDbTracks(): Promise<ContentTrack[]> {
  if (!db) return [];
  return db.select().from(contentTracks).orderBy(asc(contentTracks.order));
}

export async function listDbLessons(): Promise<ContentLesson[]> {
  if (!db) return [];
  return db.select().from(contentLessons).orderBy(asc(contentLessons.order));
}

export async function getDbLesson(id: string): Promise<ContentLesson | null> {
  if (!db) return null;
  const rows = await db
    .select()
    .from(contentLessons)
    .where(eq(contentLessons.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Normalize a user-typed slug to a safe URL segment. */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9؀-ۿ-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

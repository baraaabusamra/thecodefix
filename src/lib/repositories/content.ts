import { eq } from "drizzle-orm";
import { contentTracks, contentLessons, type ContentTrack, type ContentLesson } from "@/db/schema";
import { DrizzleRepository } from "./base";

export class DrizzleContentTrackRepository extends DrizzleRepository<ContentTrack> {
  async findById(id: string): Promise<ContentTrack | null> {
    if (!this.db) return null;
    const rows = await this.db.select().from(contentTracks).where(eq(contentTracks.slug, id)).limit(1);
    return rows[0] ?? null;
  }

  async findAll(): Promise<ContentTrack[]> {
    if (!this.db) return [];
    return this.db.select().from(contentTracks);
  }

  async save(entity: ContentTrack): Promise<void> {
    if (!this.db) return;
    await this.db.insert(contentTracks).values(entity).onConflictDoUpdate({ target: contentTracks.slug, set: entity });
  }

  async delete(id: string): Promise<void> {
    if (!this.db) return;
    await this.db.delete(contentTracks).where(eq(contentTracks.slug, id));
  }
}

export class DrizzleContentLessonRepository extends DrizzleRepository<ContentLesson> {
  async findById(id: string): Promise<ContentLesson | null> {
    if (!this.db) return null;
    const rows = await this.db.select().from(contentLessons).where(eq(contentLessons.id, id)).limit(1);
    return rows[0] ?? null;
  }

  async findByTrack(track: string): Promise<ContentLesson[]> {
    if (!this.db) return [];
    return this.db.select().from(contentLessons).where(eq(contentLessons.track, track));
  }

  async save(entity: ContentLesson): Promise<void> {
    if (!this.db) return;
    await this.db.insert(contentLessons).values(entity).onConflictDoUpdate({ target: contentLessons.id, set: entity });
  }

  async delete(id: string): Promise<void> {
    if (!this.db) return;
    await this.db.delete(contentLessons).where(eq(contentLessons.id, id));
  }
}

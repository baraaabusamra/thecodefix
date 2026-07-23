import { db } from "@/db";
import { creators, videoSubmissions, users, notifications } from "@/db/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";
import type { NewCreator, Creator, VideoSubmission } from "@/db/schema";

export type CreatorListOptions = {
  status?: "active" | "suspended";
  search?: string;
  limit?: number;
  offset?: number;
};

export type CreatorRow = {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  avatar: string | null;
  website: string | null;
  platforms: string;
  socialLinks: string | null;
  status: string;
  totalSubmissions: number;
  approvedSubmissions: number;
  createdAt: Date;
  updatedAt: Date;
  userEmail: string | null;
};

export async function listCreators(options?: CreatorListOptions): Promise<CreatorRow[] | null> {
  if (!db) return null;
  const conditions = [];
  if (options?.status) conditions.push(eq(creators.status, options.status));
  if (options?.search) conditions.push(sql`${creators.displayName} ILIKE ${`%${options.search}%`}`);
  const rows = await db
    .select({
      id: creators.id,
      userId: creators.userId,
      displayName: creators.displayName,
      bio: creators.bio,
      avatar: creators.avatar,
      website: creators.website,
      platforms: creators.platforms,
      socialLinks: creators.socialLinks,
      status: creators.status,
      totalSubmissions: creators.totalSubmissions,
      approvedSubmissions: creators.approvedSubmissions,
      createdAt: creators.createdAt,
      updatedAt: creators.updatedAt,
      userEmail: users.email,
    })
    .from(creators)
    .leftJoin(users, eq(creators.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(creators.updatedAt))
    .limit(options?.limit ?? 50)
    .offset(options?.offset ?? 0);
  return rows;
}

export async function getCreator(id: string): Promise<CreatorRow | null> {
  if (!db) return null;
  const rows = await db
    .select({
      id: creators.id,
      userId: creators.userId,
      displayName: creators.displayName,
      bio: creators.bio,
      avatar: creators.avatar,
      website: creators.website,
      platforms: creators.platforms,
      socialLinks: creators.socialLinks,
      status: creators.status,
      totalSubmissions: creators.totalSubmissions,
      approvedSubmissions: creators.approvedSubmissions,
      createdAt: creators.createdAt,
      updatedAt: creators.updatedAt,
      userEmail: users.email,
    })
    .from(creators)
    .leftJoin(users, eq(creators.userId, users.id))
    .where(eq(creators.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export async function getCreatorByUserId(userId: string): Promise<CreatorRow | null> {
  if (!db) return null;
  const rows = await db
    .select({
      id: creators.id,
      userId: creators.userId,
      displayName: creators.displayName,
      bio: creators.bio,
      avatar: creators.avatar,
      website: creators.website,
      platforms: creators.platforms,
      socialLinks: creators.socialLinks,
      status: creators.status,
      totalSubmissions: creators.totalSubmissions,
      approvedSubmissions: creators.approvedSubmissions,
      createdAt: creators.createdAt,
      updatedAt: creators.updatedAt,
      userEmail: users.email,
    })
    .from(creators)
    .leftJoin(users, eq(creators.userId, users.id))
    .where(eq(creators.userId, userId))
    .limit(1);
  return rows[0] ?? null;
}

export async function listSubmissionsByCreator(
  creatorId: string
): Promise<VideoSubmission[] | null> {
  if (!db) return null;
  return db
    .select()
    .from(videoSubmissions)
    .where(eq(videoSubmissions.creatorId, creatorId))
    .orderBy(desc(videoSubmissions.createdAt));
}

export async function listSubmissionsByStatus(
  status: "pending" | "approved" | "rejected" | "needs_revision"
): Promise<VideoSubmission[] | null> {
  if (!db) return null;
  return db
    .select()
    .from(videoSubmissions)
    .where(eq(videoSubmissions.status, status))
    .orderBy(desc(videoSubmissions.createdAt));
}

export async function createCreator(data: NewCreator): Promise<Creator | null> {
  if (!db) return null;
  const rows = await db.insert(creators).values(data).returning();
  return rows[0] ?? null;
}

export async function updateCreator(
  id: string,
  data: Partial<Omit<Creator, "id" | "createdAt">>
): Promise<Creator | null> {
  if (!db) return null;
  const rows = await db
    .update(creators)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(creators.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function updateSubmissionStatus(
  id: string,
  status: "pending" | "approved" | "rejected" | "needs_revision",
  reviewedBy: string,
  reviewNote?: string
): Promise<VideoSubmission | null> {
  if (!db) return null;
  const rows = await db
    .update(videoSubmissions)
    .set({
      status,
      reviewedBy,
      reviewNote: reviewNote ?? null,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(videoSubmissions.id, id))
    .returning();
  return rows[0] ?? null;
}

export type CreatorStats = {
  totalSubmissions: number;
  approvedSubmissions: number;
  rejectionRate: number;
};

export async function getCreatorStats(creatorId: string): Promise<CreatorStats | null> {
  if (!db) return null;
  const rows = await db
    .select({
      totalSubmissions: count(),
      approvedSubmissions: sql<number>`SUM(CASE WHEN ${videoSubmissions.status} = 'approved' THEN 1 ELSE 0 END)`,
    })
    .from(videoSubmissions)
    .where(eq(videoSubmissions.creatorId, creatorId));
  const row = rows[0];
  if (!row) return null;
  return {
    totalSubmissions: Number(row.totalSubmissions),
    approvedSubmissions: Number(row.approvedSubmissions),
    rejectionRate: row.totalSubmissions > 0
      ? (row.totalSubmissions - Number(row.approvedSubmissions)) / row.totalSubmissions
      : 0,
  };
}

export type SubmissionStats = {
  pending: number;
  approved: number;
  rejected: number;
  needsRevision: number;
};

export async function listNotifications(
  userId: string,
  limit = 20
): Promise<typeof notifications.$inferSelect[] | null> {
  if (!db) return null;
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function markNotificationRead(id: string): Promise<void> {
  if (!db) return;
  await db
    .update(notifications)
    .set({ read: true })
    .where(eq(notifications.id, id));
}

export type ApprovedSubmission = {
  id: string;
  title: string;
  description: string | null;
  platform: string;
  videoUrl: string;
  thumbnail: string | null;
  hashtags: string | null;
  createdAt: Date;
  creatorId: string;
  creatorDisplayName: string;
};

export async function listApprovedSubmissions(
  options?: { platform?: string; search?: string; limit?: number; offset?: number }
): Promise<ApprovedSubmission[] | null> {
  if (!db) return null;
  const conditions = [eq(videoSubmissions.status, "approved")];
  if (options?.platform) conditions.push(eq(videoSubmissions.platform, options.platform as "youtube" | "instagram" | "tiktok" | "facebook"));
  if (options?.search) {
    conditions.push(
      sql`(${videoSubmissions.title} ILIKE ${`%${options.search}%`} OR ${creators.displayName} ILIKE ${`%${options.search}%`} OR ${videoSubmissions.hashtags} ILIKE ${`%${options.search}%`})`
    );
  }
  const rows = await db
    .select({
      id: videoSubmissions.id,
      title: videoSubmissions.title,
      description: videoSubmissions.description,
      platform: videoSubmissions.platform,
      videoUrl: videoSubmissions.videoUrl,
      thumbnail: videoSubmissions.thumbnail,
      hashtags: videoSubmissions.hashtags,
      createdAt: videoSubmissions.createdAt,
      creatorId: videoSubmissions.creatorId,
      creatorDisplayName: creators.displayName,
    })
    .from(videoSubmissions)
    .innerJoin(creators, eq(videoSubmissions.creatorId, creators.id))
    .where(and(...conditions))
    .orderBy(desc(videoSubmissions.createdAt))
    .limit(options?.limit ?? 50)
    .offset(options?.offset ?? 0);
  return rows;
}

export async function getCreatorByDisplayName(
  displayName: string
): Promise<CreatorRow | null> {
  if (!db) return null;
  const rows = await db
    .select({
      id: creators.id,
      userId: creators.userId,
      displayName: creators.displayName,
      bio: creators.bio,
      avatar: creators.avatar,
      website: creators.website,
      platforms: creators.platforms,
      socialLinks: creators.socialLinks,
      status: creators.status,
      totalSubmissions: creators.totalSubmissions,
      approvedSubmissions: creators.approvedSubmissions,
      createdAt: creators.createdAt,
      updatedAt: creators.updatedAt,
      userEmail: users.email,
    })
    .from(creators)
    .leftJoin(users, eq(creators.userId, users.id))
    .where(eq(creators.displayName, displayName))
    .limit(1);
  return rows[0] ?? null;
}

export async function getSubmissionStats(): Promise<SubmissionStats | null> {
  if (!db) return null;
  const rows = await db
    .select({
      status: videoSubmissions.status,
      count: count(),
    })
    .from(videoSubmissions)
    .groupBy(videoSubmissions.status);
  const stats: SubmissionStats = { pending: 0, approved: 0, rejected: 0, needsRevision: 0 };
  for (const row of rows) {
    if (row.status === "pending") stats.pending = Number(row.count);
    else if (row.status === "approved") stats.approved = Number(row.count);
    else if (row.status === "rejected") stats.rejected = Number(row.count);
    else if (row.status === "needs_revision") stats.needsRevision = Number(row.count);
  }
  return stats;
}

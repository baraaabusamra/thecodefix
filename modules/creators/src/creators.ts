import { db } from "@tcf/db";
import { creators, posts, users, notifications } from "@tcf/db/schema";
import { eq, desc, and, count, sql } from "drizzle-orm";
import type { NewCreator, Creator, Post } from "@tcf/db/schema";

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
  socialLinks: string | null;
  status: string;
  totalSubmissions: number;
  approvedSubmissions: number;
  createdAt: Date;
  updatedAt: Date;
  userEmail: string | null;
};

const CREATOR_ROW_COLUMNS = {
  id: creators.id,
  userId: creators.userId,
  displayName: creators.displayName,
  bio: creators.bio,
  avatar: creators.avatar,
  website: creators.website,
  socialLinks: creators.socialLinks,
  status: creators.status,
  totalSubmissions: creators.totalSubmissions,
  approvedSubmissions: creators.approvedSubmissions,
  createdAt: creators.createdAt,
  updatedAt: creators.updatedAt,
  userEmail: users.email,
} as const;

export async function listCreators(options?: CreatorListOptions): Promise<CreatorRow[] | null> {
  if (!db) return null;
  const conditions = [];
  if (options?.status) conditions.push(eq(creators.status, options.status));
  if (options?.search) conditions.push(sql`${creators.displayName} ILIKE ${`%${options.search}%`}`);
  const rows = await db
    .select(CREATOR_ROW_COLUMNS)
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
    .select(CREATOR_ROW_COLUMNS)
    .from(creators)
    .leftJoin(users, eq(creators.userId, users.id))
    .where(eq(creators.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** All pages a user account owns — a user can own more than one (personal +
 * one per brand/company they represent), like LinkedIn Company Pages. */
export async function listCreatorsByUserId(userId: string): Promise<CreatorRow[] | null> {
  if (!db) return null;
  return db
    .select(CREATOR_ROW_COLUMNS)
    .from(creators)
    .leftJoin(users, eq(creators.userId, users.id))
    .where(eq(creators.userId, userId))
    .orderBy(desc(creators.createdAt));
}

/** Resolves which of a user's pages is "active" for the creator-hub UI
 * (dashboard/submit/submissions) — the page named by `requestedId` if the
 * user actually owns it, else their most recently created page. */
export async function resolveActiveCreator(
  userId: string,
  requestedId?: string
): Promise<{ active: CreatorRow; all: CreatorRow[] } | null> {
  const all = await listCreatorsByUserId(userId);
  if (!all || all.length === 0) return null;
  const active = (requestedId && all.find((c) => c.id === requestedId)) || all[0];
  return { active, all };
}

export async function isDisplayNameTaken(displayName: string): Promise<boolean> {
  if (!db) return false;
  const rows = await db
    .select({ id: creators.id })
    .from(creators)
    .where(eq(creators.displayName, displayName))
    .limit(1);
  return rows.length > 0;
}

export async function listPostsByCreator(creatorId: string): Promise<Post[] | null> {
  if (!db) return null;
  return db
    .select()
    .from(posts)
    .where(eq(posts.creatorId, creatorId))
    .orderBy(desc(posts.createdAt));
}

export async function listPostsByStatus(
  status: "pending" | "approved" | "rejected" | "needs_revision"
): Promise<Post[] | null> {
  if (!db) return null;
  return db
    .select()
    .from(posts)
    .where(eq(posts.status, status))
    .orderBy(desc(posts.createdAt));
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

export async function getPost(id: string): Promise<Post | null> {
  if (!db) return null;
  const rows = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  return rows[0] ?? null;
}

/** Creator-side edit: changing a post's content always sends it back to
 * "pending" for re-review, even if it was already approved — an approved
 * post's public content should never change without the team re-checking it. */
export async function updatePostContent(
  id: string,
  data: { title: string; body: string; imageUrl: string | null; link: string | null; hashtags: string | null }
): Promise<Post | null> {
  if (!db) return null;
  const rows = await db
    .update(posts)
    .set({
      ...data,
      status: "pending",
      reviewedBy: null,
      reviewNote: null,
      reviewedAt: null,
      publishedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))
    .returning();
  return rows[0] ?? null;
}

export async function deletePost(id: string): Promise<void> {
  if (!db) return;
  await db.delete(posts).where(eq(posts.id, id));
}

export async function updatePostStatus(
  id: string,
  status: "pending" | "approved" | "rejected" | "needs_revision",
  reviewedBy: string,
  reviewNote?: string
): Promise<Post | null> {
  if (!db) return null;
  const rows = await db
    .update(posts)
    .set({
      status,
      reviewedBy,
      reviewNote: reviewNote ?? null,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, id))
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
      approvedSubmissions: sql<number>`SUM(CASE WHEN ${posts.status} = 'approved' THEN 1 ELSE 0 END)`,
    })
    .from(posts)
    .where(eq(posts.creatorId, creatorId));
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

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  if (!db) return;
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export type ApprovedPost = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  link: string | null;
  hashtags: string | null;
  createdAt: Date;
  creatorId: string;
  creatorDisplayName: string;
};

export async function listApprovedPosts(
  options?: { search?: string; limit?: number; offset?: number }
): Promise<ApprovedPost[] | null> {
  if (!db) return null;
  const conditions = [eq(posts.status, "approved"), eq(creators.status, "active")];
  if (options?.search) {
    conditions.push(
      sql`(${posts.title} ILIKE ${`%${options.search}%`} OR ${creators.displayName} ILIKE ${`%${options.search}%`} OR ${posts.hashtags} ILIKE ${`%${options.search}%`})`
    );
  }
  const rows = await db
    .select({
      id: posts.id,
      title: posts.title,
      body: posts.body,
      imageUrl: posts.imageUrl,
      link: posts.link,
      hashtags: posts.hashtags,
      createdAt: posts.createdAt,
      creatorId: posts.creatorId,
      creatorDisplayName: creators.displayName,
    })
    .from(posts)
    .innerJoin(creators, eq(posts.creatorId, creators.id))
    .where(and(...conditions))
    .orderBy(desc(posts.createdAt))
    .limit(options?.limit ?? 50)
    .offset(options?.offset ?? 0);
  return rows;
}

export async function getCreatorByDisplayName(
  displayName: string
): Promise<CreatorRow | null> {
  if (!db) return null;
  const rows = await db
    .select(CREATOR_ROW_COLUMNS)
    .from(creators)
    .leftJoin(users, eq(creators.userId, users.id))
    .where(eq(creators.displayName, displayName))
    .limit(1);
  return rows[0] ?? null;
}

export async function getPostStats(): Promise<SubmissionStats | null> {
  if (!db) return null;
  const rows = await db
    .select({
      status: posts.status,
      count: count(),
    })
    .from(posts)
    .groupBy(posts.status);
  const stats: SubmissionStats = { pending: 0, approved: 0, rejected: 0, needsRevision: 0 };
  for (const row of rows) {
    if (row.status === "pending") stats.pending = Number(row.count);
    else if (row.status === "approved") stats.approved = Number(row.count);
    else if (row.status === "rejected") stats.rejected = Number(row.count);
    else if (row.status === "needs_revision") stats.needsRevision = Number(row.count);
  }
  return stats;
}

import { db } from "@/db";
import { users, auditLogs, userProgress } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import type { Role } from "@/lib/rbac";
import { PASS_RATIO, type Progress } from "@/lib/progress-types";

// Query helpers for the Users and Settings admin sections. Each returns `null`
// when the database is not configured, so pages can render a "connect the
// database" state instead of crashing.

export type AdminUserRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: Role;
  createdAt: Date;
};

export async function listUsers(): Promise<AdminUserRow[] | null> {
  if (!db) return null;
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt));
  return rows;
}

export type ProgressStat = { lessonsCompleted: number; quizzesPassed: number };

/** Per-user progress summary, keyed by userId. `null` when DB is off. */
export async function listProgressStats(): Promise<Map<
  string,
  ProgressStat
> | null> {
  if (!db) return null;
  const rows = await db.select().from(userProgress);
  const map = new Map<string, ProgressStat>();
  for (const r of rows) {
    let data: Partial<Progress> = {};
    try {
      data = JSON.parse(r.data || "{}");
    } catch {
      data = {};
    }
    const lessonsCompleted = Object.values(data.completedLessons ?? {}).reduce(
      (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
      0
    );
    const quizzesPassed = Object.values(data.quizzes ?? {}).filter(
      (q) => q && q.total > 0 && q.score / q.total >= PASS_RATIO
    ).length;
    map.set(r.userId, { lessonsCompleted, quizzesPassed });
  }
  return map;
}

export type AuditRow = {
  id: string;
  action: string;
  target: string | null;
  createdAt: Date;
  actorName: string | null;
  actorEmail: string | null;
};

export async function listAuditLogs(limit = 50): Promise<AuditRow[] | null> {
  if (!db) return null;
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      target: auditLogs.target,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
      actorEmail: users.email,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

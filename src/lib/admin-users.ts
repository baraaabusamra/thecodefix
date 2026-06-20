import { db } from "@/db";
import { users, auditLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import type { Role } from "@/lib/rbac";

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

import { db } from "@/db";
import { workReports, users } from "@/db/schema";
import { alias } from "drizzle-orm/pg-core";
import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { type AdminAccess } from "@/lib/admin-access";
import { requireCapability } from "@/lib/authorization";
import { type Role } from "@/lib/rbac";

// Query helpers + access asserts for the Team Reports section (تقارير الفريق).
// Ops team members (marketing, designer, operations) submit work reports; the
// operations manager reviews them; admin/owner see and review everything.

/** Server Actions are public endpoints — re-verify capability before writes. */
export async function assertReports(
  cap: "reports:submit" | "reports:review"
): Promise<{ access: AdminAccess & { ok: true }; userId: string | null }> {
  const access = await requireCapability(cap);
  // The signed-in user's id (null in ADMIN_TOKEN fallback mode, where there is
  // no user row to attribute reports to).
  const session = await auth();
  return { access, userId: session?.user?.id ?? null };
}

export type ReportRow = {
  id: string;
  category:
    | "social_media"
    | "podcast"
    | "event"
    | "photography"
    | "content_writing"
    | "design"
    | "other";
  title: string;
  details: string;
  links: string | null;
  workDate: Date;
  status: "pending" | "approved" | "rejected";
  reviewNote: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  authorId: string;
  authorName: string | null;
  authorEmail: string | null;
  authorRole: Role | null;
  reviewerName: string | null;
};

const reviewer = alias(users, "reviewer");

const reportShape = {
  id: workReports.id,
  category: workReports.category,
  title: workReports.title,
  details: workReports.details,
  links: workReports.links,
  workDate: workReports.workDate,
  status: workReports.status,
  reviewNote: workReports.reviewNote,
  reviewedAt: workReports.reviewedAt,
  createdAt: workReports.createdAt,
  authorId: workReports.userId,
  authorName: users.name,
  authorEmail: users.email,
  authorRole: users.role,
  reviewerName: reviewer.name,
};

/** All reports (reviewers) or a single member's reports (submitters). */
export async function listReports(opts?: {
  userId?: string;
}): Promise<ReportRow[] | null> {
  if (!db) return null;
  return db
    .select(reportShape)
    .from(workReports)
    .leftJoin(users, eq(workReports.userId, users.id))
    .leftJoin(reviewer, eq(workReports.reviewedBy, reviewer.id))
    .where(opts?.userId ? eq(workReports.userId, opts.userId) : undefined)
    .orderBy(desc(workReports.createdAt)) as Promise<ReportRow[]>;
}

export async function getReport(id: string): Promise<ReportRow | null> {
  if (!db) return null;
  const rows = (await db
    .select(reportShape)
    .from(workReports)
    .leftJoin(users, eq(workReports.userId, users.id))
    .leftJoin(reviewer, eq(workReports.reviewedBy, reviewer.id))
    .where(eq(workReports.id, id))
    .limit(1)) as ReportRow[];
  return rows[0] ?? null;
}

/** Per-member rollup for the reviewer overview table. */
export type MemberSummary = {
  authorId: string;
  authorName: string | null;
  authorRole: Role | null;
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  lastReportAt: Date | null;
};

export function summarizeByMember(rows: ReportRow[]): MemberSummary[] {
  const byId = new Map<string, MemberSummary>();
  for (const r of rows) {
    let m = byId.get(r.authorId);
    if (!m) {
      m = {
        authorId: r.authorId,
        authorName: r.authorName,
        authorRole: r.authorRole,
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        lastReportAt: null,
      };
      byId.set(r.authorId, m);
    }
    m.total += 1;
    m[r.status] += 1;
    if (!m.lastReportAt || r.createdAt > m.lastReportAt)
      m.lastReportAt = r.createdAt;
  }
  return [...byId.values()].sort((a, b) => b.total - a.total);
}

import { db } from "@/db";
import {
  instructors,
  instructorTracks,
  tickets,
  ticketReplies,
  contentLessons,
  users,
} from "@/db/schema";
import { alias } from "drizzle-orm/pg-core";
import { asc, desc, eq, ne } from "drizzle-orm";
import { requireCapability } from "@/lib/authorization";
import { can, type Capability } from "@/lib/rbac";
import { decryptField } from "@/lib/crypto";

// Query helpers + access asserts for the Operations section (instructors,
// content review, support tickets). Follows the admin-users.ts pattern:
// queries return `null` when the database is not configured.

/** Server Actions are public endpoints — re-verify capability before writes. */
export async function assertOps(extra?: Capability) {
  const access = await requireCapability("ops:manage");
  if (extra && !can(access.role, extra)) {
    throw new Error("Forbidden");
  }
  return access;
}

// ── Instructors ──────────────────────────────────────────────────────
// Base shape deliberately EXCLUDES the finance columns (payoutMethod,
// bankDetails) — those are admin-only and fetched via getInstructorPayout.
const instructorBase = {
  id: instructors.id,
  name: instructors.name,
  specialty: instructors.specialty,
  status: instructors.status,
  email: instructors.email,
  phone: instructors.phone,
  notes: instructors.notes,
  contractUrl: instructors.contractUrl,
  lastContentAt: instructors.lastContentAt,
  createdAt: instructors.createdAt,
  updatedAt: instructors.updatedAt,
};

export type InstructorRow = {
  id: string;
  name: string;
  specialty: string;
  status: "contacting" | "signed" | "active" | "paused";
  email: string | null;
  phone: string | null;
  notes: string | null;
  contractUrl: string | null;
  lastContentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export async function listInstructors(): Promise<InstructorRow[] | null> {
  if (!db) return null;
  return db
    .select(instructorBase)
    .from(instructors)
    .orderBy(desc(instructors.updatedAt));
}

export async function getInstructor(id: string): Promise<InstructorRow | null> {
  if (!db) return null;
  const rows = await db
    .select(instructorBase)
    .from(instructors)
    .where(eq(instructors.id, id))
    .limit(1);
  return rows[0] ?? null;
}

/** Finance fields. Callers MUST gate on the billing:manage capability. */
export async function getInstructorPayout(
  id: string
): Promise<{ payoutMethod: string | null; bankDetails: string | null } | null> {
  if (!db) return null;
  const rows = await db
    .select({
      payoutMethod: instructors.payoutMethod,
      bankDetails: instructors.bankDetails,
    })
    .from(instructors)
    .where(eq(instructors.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  return {
    payoutMethod: row.payoutMethod ? decryptField(row.payoutMethod) : row.payoutMethod,
    bankDetails: row.bankDetails ? decryptField(row.bankDetails) : row.bankDetails,
  };
}

export async function listInstructorTrackSlugs(
  instructorId: string
): Promise<string[]> {
  if (!db) return [];
  const rows = await db
    .select({ track: instructorTracks.track })
    .from(instructorTracks)
    .where(eq(instructorTracks.instructorId, instructorId))
    .orderBy(asc(instructorTracks.track));
  return rows.map((r) => r.track);
}

// ── Content review workflow ──────────────────────────────────────────
export type ReviewLessonRow = {
  id: string;
  track: string;
  slug: string;
  title: string;
  status: "draft" | "review" | "published" | "suspended";
  reviewNotes: string | null;
  updatedAt: Date;
};

export async function listReviewLessons(): Promise<ReviewLessonRow[] | null> {
  if (!db) return null;
  return db
    .select({
      id: contentLessons.id,
      track: contentLessons.track,
      slug: contentLessons.slug,
      title: contentLessons.title,
      status: contentLessons.status,
      reviewNotes: contentLessons.reviewNotes,
      updatedAt: contentLessons.updatedAt,
    })
    .from(contentLessons)
    .orderBy(desc(contentLessons.updatedAt));
}

// ── Support tickets ──────────────────────────────────────────────────
const assignees = alias(users, "assignee");

export type TicketRow = {
  id: string;
  subject: string;
  priority: "low" | "normal" | "high";
  status: "new" | "in_progress" | "closed";
  requesterEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
  requesterName: string | null;
  requesterUserEmail: string | null;
  assigneeName: string | null;
};

const ticketBase = {
  id: tickets.id,
  subject: tickets.subject,
  priority: tickets.priority,
  status: tickets.status,
  requesterEmail: tickets.requesterEmail,
  createdAt: tickets.createdAt,
  updatedAt: tickets.updatedAt,
  requesterName: users.name,
  requesterUserEmail: users.email,
  assigneeName: assignees.name,
};

export async function listTickets(): Promise<TicketRow[] | null> {
  if (!db) return null;
  return db
    .select(ticketBase)
    .from(tickets)
    .leftJoin(users, eq(tickets.userId, users.id))
    .leftJoin(assignees, eq(tickets.assigneeId, assignees.id))
    .orderBy(desc(tickets.updatedAt));
}

export type TicketDetail = TicketRow & {
  body: string;
  userId: string | null;
  assigneeId: string | null;
};

export async function getTicket(id: string): Promise<TicketDetail | null> {
  if (!db) return null;
  const rows = await db
    .select({
      ...ticketBase,
      body: tickets.body,
      userId: tickets.userId,
      assigneeId: tickets.assigneeId,
    })
    .from(tickets)
    .leftJoin(users, eq(tickets.userId, users.id))
    .leftJoin(assignees, eq(tickets.assigneeId, assignees.id))
    .where(eq(tickets.id, id))
    .limit(1);
  return rows[0] ?? null;
}

export type TicketReplyRow = {
  id: string;
  body: string;
  internal: boolean;
  createdAt: Date;
  authorName: string | null;
};

export async function listTicketReplies(
  ticketId: string
): Promise<TicketReplyRow[]> {
  if (!db) return [];
  return db
    .select({
      id: ticketReplies.id,
      body: ticketReplies.body,
      internal: ticketReplies.internal,
      createdAt: ticketReplies.createdAt,
      authorName: users.name,
    })
    .from(ticketReplies)
    .leftJoin(users, eq(ticketReplies.authorId, users.id))
    .where(eq(ticketReplies.ticketId, ticketId))
    .orderBy(asc(ticketReplies.createdAt));
}

/** Team members (non-students) for the ticket assignee select. */
export async function listTeamMembers(): Promise<
  { id: string; name: string | null; email: string | null }[]
> {
  if (!db) return [];
  return db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(ne(users.role, "student"))
    .orderBy(asc(users.name));
}

// Operations: external instructors, support tickets, team work reports and
// outreach contacts.
//
// Extracted from the single src/db/schema.ts in Phase 2. That file is still
// the public entry point. No table, column, SQL type, default, index,
// constraint or enum value changed in the move.

import {
  pgTable,
  pgEnum,
  text,
  timestamp,
  boolean,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

// ── Operations: instructors ──────────────────────────────────────────
// External instructors producing course content. Managed from the Operations
// section. Finance fields (payout/bank) are admin-only — Operations queries
// must not select them (see src/lib/admin-operations.ts).
export const instructorStatus = pgEnum("instructor_status", [
  "contacting", // قيد التواصل
  "signed", // تم التوقيع
  "active", // نشط
  "paused", // متوقف
]);

export const instructors = pgTable(
  "instructor",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    specialty: text("specialty").notNull().default(""),
    status: instructorStatus("status").notNull().default("contacting"),
    email: text("email"),
    phone: text("phone"),
    notes: text("notes"),
    contractUrl: text("contractUrl"), // link to the signed contract (Drive, …)
    // Admin-only finance fields — never expose to the operations role.
    payoutMethod: text("payoutMethod"),
    bankDetails: text("bankDetails"),
    lastContentAt: timestamp("lastContentAt", { mode: "date" }), // آخر محتوى
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("instructor_status_idx").on(t.status)]
);

// Which tracks (courses) an instructor owns. `track` is a track slug, same
// convention as content_lesson.track (file- or db-based).
export const instructorTracks = pgTable(
  "instructor_track",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    instructorId: text("instructorId")
      .notNull()
      .references(() => instructors.id, { onDelete: "cascade" }),
    track: text("track").notNull(),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique("instructor_track_unique").on(t.instructorId, t.track)]
);

// ── Operations: support tickets ──────────────────────────────────────
export const ticketStatus = pgEnum("ticket_status", [
  "new", // جديدة
  "in_progress", // قيد المعالجة
  "closed", // مغلقة
]);

export const ticketPriority = pgEnum("ticket_priority", [
  "low", // منخفضة
  "normal", // عادية
  "high", // عالية
]);

export const tickets = pgTable(
  "ticket",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    subject: text("subject").notNull(),
    body: text("body").notNull().default(""),
    userId: text("userId").references(() => users.id, { onDelete: "set null" }), // requester
    requesterEmail: text("requesterEmail"), // for requesters without an account
    priority: ticketPriority("priority").notNull().default("normal"),
    status: ticketStatus("status").notNull().default("new"),
    assigneeId: text("assigneeId").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("ticket_status_idx").on(t.status),
    index("ticket_assignee_id_idx").on(t.assigneeId),
  ]
);

// Conversation thread on a ticket. `internal` replies are team-only notes,
// never shown to the requester.
export const ticketReplies = pgTable("ticket_reply", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  ticketId: text("ticketId")
    .notNull()
    .references(() => tickets.id, { onDelete: "cascade" }),
  authorId: text("authorId").references(() => users.id, {
    onDelete: "set null",
  }),
  body: text("body").notNull(),
  internal: boolean("internal").notNull().default(false),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export type Instructor = typeof instructors.$inferSelect;
export type InstructorTrack = typeof instructorTracks.$inferSelect;
export type Ticket = typeof tickets.$inferSelect;
export type TicketReply = typeof ticketReplies.$inferSelect;

// ── Team work reports (Operations → تقارير الفريق) ───────────────────
// Ops team members (marketing, designer, …) log what they did; the operations
// manager approves/rejects each report; owner/admin see everything.
export const reportStatus = pgEnum("report_status", [
  "pending", // awaiting the operations manager's review
  "approved",
  "rejected", // reviewNote explains why / what to redo
]);

export const reportCategory = pgEnum("report_category", [
  "social_media", // posts, campaigns, community replies
  "podcast",
  "event", // meetups, workshops, sponsorships
  "photography", // photo/video shoots
  "content_writing",
  "design",
  "other",
]);

export const workReports = pgTable(
  "work_report",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category: reportCategory("category").notNull(),
    title: text("title").notNull(),
    details: text("details").notNull(), // what was done, outcomes
    links: text("links"), // optional deliverable URLs (one per line)
    workDate: timestamp("workDate", { mode: "date" }).notNull().defaultNow(),
    status: reportStatus("status").notNull().default("pending"),
    reviewNote: text("reviewNote"), // reviewer feedback (esp. on rejection)
    reviewedBy: text("reviewedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("work_report_user_id_idx").on(t.userId),
    index("work_report_status_idx").on(t.status),
  ]
);

// ── Outreach tracker (Operations → متابعة التواصل) ───────────────────
// Funding bodies + instructor candidates from the outreach guides, each with
// a contact status ("done or not yet") and a free-text outcome report.
export const outreachGuide = pgEnum("outreach_guide", [
  "funding", // حاضنات، صناديق، مستثمرون، بنوك، مسابقات، دخل مباشر
  "instructors", // محاضرون، مجتمعات أردنية، منصات، صفحات انستغرام
]);

export const outreachStatus = pgEnum("outreach_status", [
  "todo", // لسا — لم نتواصل بعد
  "contacted", // تم التواصل — بانتظار رد
  "replied", // في تجاوب — نقاش جارٍ
  "done", // منتهي — اتفاق أو نتيجة نهائية (التفاصيل في report)
  "rejected", // اعتذروا / غير مناسب
]);

export const outreachContacts = pgTable(
  "outreach_contact",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    guide: outreachGuide("guide").notNull(),
    category: text("category").notNull(), // acc/gov/vc/bank/comp/rev · lec/jor/plt/ig
    name: text("name").notNull(),
    description: text("description"),
    url: text("url"),
    status: outreachStatus("status").notNull().default("todo"),
    report: text("report"), // ماذا حدث: من تواصل، الرد، الاتفاق…
    updatedBy: text("updatedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("outreach_contact_status_idx").on(t.status)]
);

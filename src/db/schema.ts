import {
  pgTable,
  pgEnum,
  text,
  integer,
  timestamp,
  primaryKey,
  boolean,
  unique,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ── Role-Based Access Control ────────────────────────────────────────
// Roles map to the admin sections each team member may touch. Capability
// checks live in src/lib/rbac.ts.
export const userRole = pgEnum("user_role", [
  "student", // default — a learner, no admin access
  "support", // resolves tickets, views/edits user accounts
  "writer", // edits documentation & quizzes
  "sales", // manages subscriptions & corporate licenses
  "operations", // runs the Operations section: instructors, content review, tickets, team reports
  "marketing", // ops team member: social media, podcasts, events, photography, content writing
  "designer", // ops team member: visual design work
  "admin", // everything except destructive system settings
  "owner", // full control incl. settings, roles, backups
]);

// ── Auth.js (NextAuth) core tables ───────────────────────────────────
// Shapes follow the official @auth/drizzle-adapter Postgres schema, with a
// `role` column added for RBAC.
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: userRole("role").notNull().default("student"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ── Admin activity log (Settings → System Logs) ──────────────────────
// Append-only record of admin actions for accountability.
export const auditLogs = pgTable("audit_log", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), // e.g. "user.role.update"
  target: text("target"), // affected entity id/slug
  meta: text("meta"), // JSON string with extra context
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// ── Billing: Premium Pro subscriptions & B2B corporate licenses ──────
// Rows are populated by the Stripe checkout + webhook flow (see
// src/app/api/stripe/webhook). The admin billing page reads them.
export const billingStatus = pgEnum("billing_status", [
  "active",
  "trialing",
  "past_due",
  "canceled",
  "incomplete",
]);

// Individual Premium Pro subscriptions.
export const subscriptions = pgTable("subscription", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  stripeCustomerId: text("stripeCustomerId"),
  stripeSubscriptionId: text("stripeSubscriptionId").unique(),
  status: billingStatus("status").notNull().default("active"),
  plan: text("plan").notNull().default("pro"),
  currentPeriodEnd: timestamp("currentPeriodEnd", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// B2B corporate clients buying a pool of training licenses (seats).
export const organizations = pgTable("organization", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  billingEmail: text("billingEmail"),
  stripeCustomerId: text("stripeCustomerId"),
  seatsTotal: integer("seatsTotal").notNull().default(0),
  status: billingStatus("status").notNull().default("active"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// Seat allocation: which employees occupy an organization's licenses.
export const organizationMembers = pgTable("organization_member", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  organizationId: text("organizationId")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  userId: text("userId").references(() => users.id, { onDelete: "set null" }),
  email: text("email").notNull(),
  status: text("status").notNull().default("invited"), // invited | active
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// ── Certificates ─────────────────────────────────────────────────────
// A verifiable record of a passed track quiz. `certId` is the public code
// printed on the certificate; the /verify page and admin dashboard look it up.
export const certificates = pgTable("certificate", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  certId: text("certId").notNull().unique(),
  userId: text("userId").references(() => users.id, { onDelete: "set null" }),
  recipientName: text("recipientName").notNull(),
  track: text("track").notNull(),
  trackTitle: text("trackTitle").notNull(),
  score: integer("score").notNull(),
  total: integer("total").notNull(),
  issuedAt: timestamp("issuedAt", { mode: "date" }).notNull().defaultNow(),
});

// ── SEO keyword tracker ──────────────────────────────────────────────
// Target keywords mapped to a page, with the last recorded Google position.
// Positions are entered manually for now; auto-fetch would use the Search
// Console API (future).
export const seoKeywords = pgTable("seo_keyword", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  keyword: text("keyword").notNull(),
  targetPath: text("targetPath"), // e.g. /learn/javascript/variables
  position: integer("position"), // last recorded Google rank
  targetPosition: integer("targetPosition").notNull().default(3),
  notes: text("notes"),
  createdBy: text("createdBy").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

// ── CMS: database-backed tracks & lessons ────────────────────────────
// New content created from the admin lives here. The public site merges these
// with the existing file-based tracks (src/content/tracks). DB content is
// editable in production (unlike files); appears live via on-demand ISR.
export const contentTracks = pgTable("content_track", {
  slug: text("slug").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull().default(""),
  icon: text("icon").notNull().default("📦"),
  color: text("color").notNull().default("#B026FF"),
  order: integer("order").notNull().default(100),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

// Editorial workflow for DB lessons (Operations → content review). `published`
// stays the single source of truth for public visibility; actions keep it in
// sync (status "published" ⇔ published=true).
export const lessonStatus = pgEnum("lesson_status", [
  "draft", // مسودة
  "review", // قيد المراجعة
  "published", // منشور
  "suspended", // موقوف
]);

export const contentLessons = pgTable(
  "content_lesson",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    track: text("track").notNull(), // track slug (file- or db-based)
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    order: integer("order").notNull().default(100),
    keywords: text("keywords"), // comma-separated
    content: text("content").notNull().default(""), // MDX body
    published: boolean("published").notNull().default(true),
    status: lessonStatus("status").notNull().default("published"),
    reviewNotes: text("reviewNotes"), // reviewer feedback (approve/reject)
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique("content_lesson_track_slug").on(t.track, t.slug)]
);

// ── Student progress (synced across devices for signed-in users) ─────
// One row per user holding the same shape as the old localStorage store
// (name + completed lessons + best quiz results) as a JSON blob.
export const userProgress = pgTable("user_progress", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  data: text("data").notNull().default("{}"), // JSON: { completedLessons, quizzes }
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

// ── Community suggestions ────────────────────────────────────────────
// Visitor-submitted requests for new languages/features. Public insert (via a
// server action); reviewed from the admin panel. Stored as plain text and
// rendered as text, so no HTML/XSS risk.
export const suggestions = pgTable("suggestion", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  type: text("type").notNull(), // "language" | "feature" | "other"
  message: text("message").notNull(),
  email: text("email"), // optional — so we can follow up
  status: text("status").notNull().default("new"), // new | planned | done | declined
  userId: text("userId").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

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

export const instructors = pgTable("instructor", {
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
});

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

export const tickets = pgTable("ticket", {
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
});

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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Suggestion = typeof suggestions.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ContentTrack = typeof contentTracks.$inferSelect;
export type ContentLesson = typeof contentLessons.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Organization = typeof organizations.$inferSelect;
export type Certificate = typeof certificates.$inferSelect;
export type SeoKeyword = typeof seoKeywords.$inferSelect;
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

export const workReports = pgTable("work_report", {
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
});

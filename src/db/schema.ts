import {
  pgTable,
  pgEnum,
  text,
  integer,
  numeric,
  timestamp,
  primaryKey,
  boolean,
  unique,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { AdapterAccountType } from "next-auth/adapters";

// ── Curriculum Pipeline Enums ──────────────────────────────────────────
export const pipelineJobStatus = pgEnum("pipeline_job_status", [
  "pending",
  "searching",
  "source_found",
  "downloading",
  "parsing",
  "extracting",
  "validating",
  "completed",
  "needs_review",
  "failed",
  "cancelled"
]);

export const pipelineSourceType = pgEnum("pipeline_source_type", [
  "official_program_page",
  "official_curriculum_page",
  "official_pdf",
  "official_course_catalog",
  "official_department_page",
  "official_handbook",
  "official_document",
  "fallback_external"
]);

export const pipelineConfidenceLevel = pgEnum("pipeline_confidence_level", [
  "HIGH",
  "MEDIUM",
  "LOW"
]);

// ── Role-Based Access Control ────────────────────────────────────────
// Roles map to the admin sections each team member may touch. Capability
// checks live in src/lib/rbac.ts.
export const userRole = pgEnum("user_role", [
  "student", // default — a learner, no admin access
  "creator", // content creator — submits videos for review
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
export const subscriptions = pgTable(
  "subscription",
  {
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
    // When this row's state was last fetched from Stripe (not from an event
    // payload). A write only applies if it is at least this fresh, so a
    // delayed/out-of-order webhook can never overwrite newer state.
    stripeSyncedAt: timestamp("stripeSyncedAt", { mode: "date" }),
  },
  (t) => [index("subscription_user_id_idx").on(t.userId)]
);

// Stripe webhook idempotency: one row per Stripe event id that has been
// fully handled. Inserted only AFTER successful processing, so a failed
// attempt leaves no row and Stripe's retry is processed normally.
export const stripeEvents = pgTable("stripe_event", {
  id: text("id").primaryKey(), // Stripe event id (evt_...)
  type: text("type").notNull(),
  eventCreatedAt: timestamp("eventCreatedAt", { mode: "date" }).notNull(),
  // "processed" | "ignored" (irrelevant type) | "unmapped" (no valid user)
  outcome: text("outcome").notNull(),
  processedAt: timestamp("processedAt", { mode: "date" }).notNull().defaultNow(),
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
//
// `status`/`examAttemptId` are additive (nullable-with-default) so existing
// rows — issued under the old client-reported-score flow, certId format
// `TCF-<TRACK>-<base36 timestamp>` — stay valid untouched. New issuances
// (server-graded tracks only, see examAttempts below) get a cryptographically
// random certId (`TCF-<uuid>`) generated server-side and set examAttemptId.
export const certificateStatus = pgEnum("certificate_status", [
  "valid",
  "revoked",
]);

export const certificates = pgTable(
  "certificate",
  {
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
    status: certificateStatus("status").notNull().default("valid"),
    // Set only for certificates issued via the new server-graded exam flow;
    // null for legacy certificates and for tracks still on the old flow.
    examAttemptId: text("examAttemptId").references(() => examAttempts.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    // Preserve historical certificate URLs after revocation, while allowing
    // exactly one currently valid certificate per signed-in user and track.
    // NULL userId rows (legacy/orphaned via onDelete:"set null") remain exempt.
    uniqueIndex("certificate_one_valid_per_user_track")
      .on(t.userId, t.track)
      .where(sql`${t.status} = 'valid'`),
  ]
);

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
  (t) => [
    unique("content_lesson_track_slug").on(t.track, t.slug),
    index("content_lesson_track_idx").on(t.track),
  ]
);

// ── Student progress (synced across devices for signed-in users) ─────
// One row per user holding the same shape as the old localStorage store
// (name + completed lessons + best quiz results) as a JSON blob.
export const userProgress = pgTable("user_progress", {
  userId: text("userId")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull().default(""),
  // LEGACY, browser-reported JSON { completedLessons, quizzes }. No longer
  // written: lessons now live in lesson_completion (server-owned) and quiz
  // results come from server-graded attempts. Read once per user to import
  // completed lessons (see completionsImportedAt).
  data: text("data").notNull().default("{}"),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  // Set once `data.completedLessons` has been imported into lesson_completion.
  completionsImportedAt: timestamp("completionsImportedAt", { mode: "date" }),
});

// ── Lesson completions (server-owned learning record) ─────────────────
// One row per (user, track, lesson). The composite primary key makes
// "mark complete" idempotent and makes duplicate counting impossible at the
// database level. Rows are only written by server actions that validated
// the track/lesson against real content.
export const lessonCompletions = pgTable(
  "lesson_completion",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    track: text("track").notNull(),
    lessonSlug: text("lessonSlug").notNull(),
    completedAt: timestamp("completedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.track, t.lessonSlug] })]
);

// ── Community suggestions ────────────────────────────────────────────
// Visitor-submitted requests for new languages/features. Public insert (via a
// server action); reviewed from the admin panel. Stored as plain text and
// rendered as text, so no HTML/XSS risk.
export const suggestions = pgTable(
  "suggestion",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    type: text("type").notNull(), // "language" | "feature" | "other"
    message: text("message").notNull(),
    email: text("email"), // optional — so we can follow up
    status: text("status").notNull().default("new"), // new | planned | done | declined
    userId: text("userId").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [index("suggestion_status_idx").on(t.status)]
);

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

// ── Weekly league snapshots (اللوحة والدوري الأسبوعي) ────────────────
// Lazy weekly baseline: the first leaderboard read of a week inserts each
// user's current total points as that week's snapshot; weekly points are
// (current total − snapshot). No cron needed — the week "resets" on first
// read after Monday 00:00 UTC.
export const leagueSnapshots = pgTable(
  "league_snapshot",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    weekStart: text("weekStart").notNull(), // "YYYY-MM-DD" (Monday, UTC)
    points: integer("points").notNull().default(0),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.weekStart)]
);

// ── Content Creator Hub ──────────────────────────────────────────
// A user account can own multiple creator pages (like LinkedIn personal
// profile → multiple Company Pages) — userId is intentionally NOT unique.
// displayName IS unique platform-wide since it doubles as the public URL
// slug at /creators/[displayName].
export const submissionStatus = pgEnum("submission_status", [
  "pending",
  "approved",
  "rejected",
  "needs_revision",
]);

export const creators = pgTable("creator", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("displayName").notNull().unique(),
  bio: text("bio"),
  avatar: text("avatar"),
  website: text("website"),
  socialLinks: text("socialLinks").default("{}"),
  status: text("status").notNull().default("active"),
  totalSubmissions: integer("totalSubmissions").notNull().default(0),
  approvedSubmissions: integer("approvedSubmissions").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

// A post published on a creator page: text body + optional image + optional
// link. Goes live only after admin approval (status transitions below).
export const posts = pgTable(
  "post",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    creatorId: text("creatorId").notNull().references(() => creators.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    imageUrl: text("imageUrl"),
    link: text("link"),
    hashtags: text("hashtags").default(""),
    status: submissionStatus("status").notNull().default("pending"),
    reviewedBy: text("reviewedBy").references(() => users.id, { onDelete: "set null" }),
    reviewNote: text("reviewNote"),
    reviewedAt: timestamp("reviewedAt", { mode: "date" }),
    publishedAt: timestamp("publishedAt", { mode: "date" }),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("post_status_idx").on(t.status),
    index("post_creator_id_idx").on(t.creatorId),
  ]
);

export const notifications = pgTable(
  "notification",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    index("notification_user_read_idx").on(t.userId, t.read),
  ]
);

// ── Job alerts (لوحة الوظائف) ─────────────────────────────────────────
// Lead capture for real job postings: a visitor leaves their email for a
// country (+ optional specialty) and gets notified when a real listing goes
// up. The country/specialty page still works with zero rows — this just
// builds an audience list that makes real employer outreach easier ("we
// already have N developers waiting for Flutter jobs in Egypt").
export const jobAlerts = pgTable(
  "job_alert",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    email: text("email").notNull(),
    country: text("country").notNull(), // Country.slug from lib/job-search.ts
    specialty: text("specialty"), // Specialty.slug from lib/job-search.ts, optional
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    unique("job_alert_email_country_unique").on(t.email, t.country),
    index("job_alert_country_idx").on(t.country),
  ]
);
export type JobAlert = typeof jobAlerts.$inferSelect;
export type NewJobAlert = typeof jobAlerts.$inferInsert;

export type Creator = typeof creators.$inferSelect;
export type NewCreator = typeof creators.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// ── Academic study plans (الجانب الأكاديمي) ───────────────────────────
// Real university curricula (course numbers, credit hours, prerequisites),
// keyed by the same (country, university, specialization) slugs used by the
// file-based catalog in src/content/academic-universities/*.json. Mirrors the
// content_track/content_lesson split: a curated study plan transcribed from an
// official document lives as a file (read-only, reviewed); one authored by an
// admin through the panel lives here and is editable in production. The
// nested category/course structure is stored as JSON text rather than
// normalized tables — it's always read/written whole (see StudyPlan in
// src/lib/academic-study-plans.ts), never queried by individual course row.
export const academicStudyPlans = pgTable(
  "academic_study_plan",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    country: text("country").notNull(),
    university: text("university").notNull(),
    specialization: text("specialization").notNull(),
    programNameEn: text("programNameEn").notNull().default(""),
    degree: text("degree").notNull().default("بكالوريوس"),
    // numeric, not integer: a program total can be fractional if any of its
    // courses are (e.g. a 1.5-credit course) — see the same reasoning on
    // pipelineCurriculumCourses.credits above.
    totalCreditHours: numeric("totalCreditHours", { precision: 5, scale: 1, mode: "number" }).notNull().default(0),
    source: text("source").notNull().default(""),
    sourceDate: text("sourceDate").notNull().default(""),
    generalNote: text("generalNote"),
    categories: text("categories").notNull().default("[]"), // JSON: StudyPlanCategory[]
    // Historical provenance of this row's CURRENT contents, not "this row
    // was ever touched by AI". The retired pipeline publisher populated the
    // exact pipelineCurriculumVersions.id; manual authoring clears it to NULL
    // in the same upsert that writes the content. Keep the nullable column so
    // existing published rows retain honest provenance without requiring a
    // destructive data migration.
    // ON DELETE SET NULL (not CASCADE/RESTRICT): this table is durable
    // public content and must survive deletion of pipeline-side history —
    // the same pattern already used for pipelineCurriculumVersions.sourceId,
    // pipelineCurriculumCourses.evidenceId, and
    // pipelineCoursePrerequisites.prerequisiteCourseId.
    pipelineCurriculumVersionId: text("pipelineCurriculumVersionId").references(
      () => pipelineCurriculumVersions.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    unique("academic_study_plan_key").on(
      t.country,
      t.university,
      t.specialization
    ),
    // Supports "find the public plan a given version produced" /
    // "find all currently-pipeline-sourced plans" lookups. Not unique: no
    // proven 1:1 requirement between a version and a plan row.
    index("academic_study_plan_pipeline_curriculum_version_id_idx").on(
      t.pipelineCurriculumVersionId
    ),
  ]
);
export type AcademicStudyPlanRow = typeof academicStudyPlans.$inferSelect;
export type NewAcademicStudyPlanRow = typeof academicStudyPlans.$inferInsert;

// ── Curriculum Pipeline Tables (Phase 1) ─────────────────────────────

// Stable identifiers mapping
export const pipelineUniversities = pgTable("pipeline_university", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  countrySlug: text("countrySlug").notNull(),
  universitySlug: text("universitySlug").notNull(),
  officialDomain: text("officialDomain"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  unique("pipeline_university_slugs").on(t.countrySlug, t.universitySlug),
]);

export const pipelinePrograms = pgTable("pipeline_program", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  universityId: text("universityId").notNull().references(() => pipelineUniversities.id, { onDelete: "cascade" }),
  specializationSlug: text("specializationSlug").notNull(),
  canonicalName: text("canonicalName"), // Optional canonical english name
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  unique("pipeline_program_slugs").on(t.universityId, t.specializationSlug),
]);

export const pipelineSources = pgTable("pipeline_source", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  universityId: text("universityId").notNull().references(() => pipelineUniversities.id, { onDelete: "cascade" }),
  programId: text("programId").references(() => pipelinePrograms.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  // Phase 3.5B-6B-1: dedup identity only — see
  // src/lib/curriculum/discovery/url-normalize.ts for the exact,
  // deliberately conservative normalization (lowercase scheme+host, drop
  // fragment/default port, collapse one trailing slash; query params and
  // www/http-https distinctions are preserved, never merged). `url` above
  // always keeps the original, unmodified string — normalizedUrl is never
  // used for the actual fetch or for SSRF validation, only for the
  // uniqueness index below. Left nullable rather than NOT NULL: every
  // current write site (jobs/process.ts) will always supply it once this
  // phase's code change ships, and the one-time backfill covers all
  // pre-existing rows, so NOT NULL would add no real protection — same
  // reasoning already applied to pipelineDocuments.contentHash in Phase
  // 3.5B-6B-2.
  normalizedUrl: text("normalizedUrl"),
  domain: text("domain"),
  sourceType: pipelineSourceType("sourceType").notNull(),
  title: text("title"),
  discoveredAt: timestamp("discoveredAt", { mode: "date" }).notNull().defaultNow(),
  lastCheckedAt: timestamp("lastCheckedAt", { mode: "date" }),
  contentHash: text("contentHash"),
  // Phase 3.5B-6B-1: 'active' | 'inactive'. Free text (matches the
  // pre-existing column's own convention, no enum), never read anywhere
  // before this phase (confirmed by full-repo grep) — repurposed here to
  // mark reconciled duplicate rows as historical/superseded WITHOUT ever
  // deleting them or reparenting their pipelineDocuments (see the Phase
  // 3.5B-6B-1 audit's provenance-cascade analysis for why deletion was
  // rejected: pipelineDocuments.sourceId is ON DELETE CASCADE, which
  // transitively cascades through extraction runs, evidence, and
  // review-queue rows). The uniqueness index below is scoped to
  // status='active' specifically so this flip is what makes a row stop
  // competing for the (universityId, programId, normalizedUrl) identity,
  // without touching anything else.
  status: text("status").notNull().default("active"),
  credibilityScore: integer("credibilityScore").notNull().default(0), // 0-100
}, (t) => [
  // Phase 3.5B-6B-1 (P1-BLOCKER duplicate source rows / duplicate discovery
  // + collection + AI cost): at most one ACTIVE source per logical
  // (universityId, programId, normalizedUrl) target. Applied ONLY after the
  // 59-row reconciliation (18 pre-existing duplicate groups, 77 rows,
  // marked non-canonical rows status='inactive') — a hard/global unique
  // index would have rejected that pre-existing data outright. Partial
  // (WHERE status='active'), not a plain unique constraint: an inactive
  // (reconciled/superseded) row must never block a future active row for
  // the same target, and this is also what makes the reconciliation itself
  // non-destructive (marking a row inactive, not deleting it, is what frees
  // up the identity slot). COALESCE(programId, '') closes the same
  // NULL-distinctness hole already handled identically in
  // pipeline_extraction_run_one_active_per_document (Phase 3.5B-4) —
  // programId is genuinely nullable (2 live rows) and NULLS NOT DISTINCT
  // is not usable here since it's unavailable on partial (WHERE-scoped)
  // indexes in this Drizzle version (confirmed in the Phase 3.5B-6A audit).
  uniqueIndex("pipeline_source_one_active_per_target")
    .on(t.universityId, sql`COALESCE(${t.programId}, '')`, t.normalizedUrl)
    .where(sql`${t.status} = 'active'`),
]);

export const pipelineDocuments = pgTable("pipeline_document", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  sourceId: text("sourceId").notNull().references(() => pipelineSources.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  storagePath: text("storagePath"), // Vercel Blob path
  mimeType: text("mimeType"),
  fileSize: integer("fileSize"),
  contentHash: text("contentHash"),
  extractedText: text("extractedText"),
  pageCount: integer("pageCount"),
  parser: text("parser"), // e.g. "pdf2json", "cheerio"
  status: text("status").notNull().default("pending"),
  downloadedAt: timestamp("downloadedAt", { mode: "date" }),
  processedAt: timestamp("processedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  // Phase 3.5B-6B-2 (P1-BLOCKER duplicate document rows / duplicate paid
  // extraction): the same downloaded bytes for the same source must resolve
  // to exactly one pipelineDocuments row — collection previously always
  // inserted a new row even when an identical-hash document already existed
  // for that source, which meant retries and concurrent collection could
  // produce two documentIds for identical content, each independently
  // eligible for Phase 3.5B-4's per-documentId extraction claim (duplicate
  // paid Gemini calls). Deliberately NOT partial/WHERE-scoped (unlike the
  // two uniqueIndexes above) — every row, not just "active" ones, must obey
  // this. Deliberately NOT global-on-contentHash: identical bytes from two
  // DIFFERENT sources must remain separate rows to preserve per-source
  // provenance (confirmed live: 9 such cross-source groups already exist
  // and are legitimate, not duplicates). contentHash stays nullable — not
  // promoted to NOT NULL — because the single write site
  // (jobs/process.ts) always supplies it already (confirmed live: 0 of 51
  // existing rows have a NULL contentHash), so a NOT NULL constraint would
  // add no real protection, only risk. Ordinary (non-COALESCE) unique index
  // is correct here since there is no legitimate case needing multiple
  // NULL-contentHash rows for the same source to count as distinct.
  uniqueIndex("pipeline_document_source_content_hash_unique").on(
    t.sourceId,
    t.contentHash
  ),
]);

export const pipelineExtractionRuns = pgTable("pipeline_extraction_run", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  documentId: text("documentId").notNull().references(() => pipelineDocuments.id, { onDelete: "cascade" }),
  model: text("model"), // e.g. "claude-3-5-sonnet-20240620"
  promptVersion: text("promptVersion"),
  status: text("status").notNull().default("started"),
  startedAt: timestamp("startedAt", { mode: "date" }).notNull().defaultNow(),
  completedAt: timestamp("completedAt", { mode: "date" }),
  tokenUsage: integer("tokenUsage"),
  estimatedCost: text("estimatedCost"), // Using text to store decimals/small fractions
  error: text("error"),
  outputHash: text("outputHash"),
}, (t) => [
  // Phase 3.5B-4 (P1 duplicate-paid-extraction): at most one active
  // ("started") attempt per logical extraction key. promptVersion is
  // nullable in the column itself (unchanged — no NOT NULL added; current
  // production code always populates it, confirmed by a live preflight:
  // 0 existing rows have a NULL promptVersion), but Postgres treats every
  // NULL as distinct in an ordinary unique index, which would silently
  // permit two concurrent NULL-promptVersion 'started' rows for the same
  // document. COALESCE(promptVersion, '') closes that hole at the index
  // level without touching the column's contract — the least invasive of
  // the three options considered (raw index / COALESCE expression index /
  // NOT NULL column).
  uniqueIndex("pipeline_extraction_run_one_active_per_document")
    .on(t.documentId, sql`COALESCE(${t.promptVersion}, '')`)
    .where(sql`${t.status} = 'started'`),
]);

export const pipelineExtractionEvidence = pgTable("pipeline_extraction_evidence", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  documentId: text("documentId").notNull().references(() => pipelineDocuments.id, { onDelete: "cascade" }),
  extractionRunId: text("extractionRunId").notNull().references(() => pipelineExtractionRuns.id, { onDelete: "cascade" }),
  pageNumber: integer("pageNumber"),
  section: text("section"),
  text: text("text").notNull(),
  coordinates: text("coordinates"), // optional JSON of bounding box
  extractedField: text("extractedField"), // which field this evidence supports
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const pipelineCurriculumVersions = pgTable("pipeline_curriculum_version", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  programId: text("programId").notNull().references(() => pipelinePrograms.id, { onDelete: "cascade" }),
  academicYear: text("academicYear"),
  title: text("title"),
  version: text("version"),
  sourceId: text("sourceId").references(() => pipelineSources.id, { onDelete: "set null" }),
  status: text("status").notNull().default("draft"), // draft, approved, deprecated
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
}, (t) => [
  // Historical integrity: at most one version may be "approved" per
  // program at a time. Keep the database constraint even though the former
  // admin review/publish interface has been retired, so existing data cannot
  // drift into an invalid state through maintenance scripts or direct writes.
  uniqueIndex("pipeline_curriculum_version_one_approved_per_program")
    .on(t.programId)
    .where(sql`${t.status} = 'approved'`),
]);

export const pipelineCourses = pgTable("pipeline_course", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  universityId: text("universityId").notNull().references(() => pipelineUniversities.id, { onDelete: "cascade" }),
  canonicalName: text("canonicalName"),
  normalizedName: text("normalizedName"),
  description: text("description"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const pipelineCurriculumCourses = pgTable("pipeline_curriculum_course", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  curriculumVersionId: text("curriculumVersionId").notNull().references(() => pipelineCurriculumVersions.id, { onDelete: "cascade" }),
  courseId: text("courseId").notNull().references(() => pipelineCourses.id, { onDelete: "cascade" }),
  officialCourseCode: text("officialCourseCode"),
  officialCourseName: text("officialCourseName"),
  // numeric, not integer: real credit hours are often fractional (e.g. a
  // 1.5-credit course with a separate lab component) — an AI extraction
  // returning 1.5 into an integer column fails the insert outright and
  // silently drops that curriculum before it ever reaches the review queue.
  credits: numeric("credits", { precision: 4, scale: 1, mode: "number" }),
  theoreticalCredits: numeric("theoreticalCredits", { precision: 4, scale: 1, mode: "number" }),
  practicalCredits: numeric("practicalCredits", { precision: 4, scale: 1, mode: "number" }),
  semester: integer("semester"),
  academicYear: integer("academicYear"), // e.g., Year 1, 2, 3
  courseType: text("courseType"), // e.g., Mandatory, Elective
  category: text("category"), // e.g., University Requirements, Faculty Requirements
  position: integer("position"), // order in the curriculum
  notes: text("notes"),
  confidence: pipelineConfidenceLevel("confidence"),
  evidenceId: text("evidenceId").references(() => pipelineExtractionEvidence.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const pipelineCoursePrerequisites = pgTable("pipeline_course_prerequisite", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  curriculumCourseId: text("curriculumCourseId").notNull().references(() => pipelineCurriculumCourses.id, { onDelete: "cascade" }),
  prerequisiteCourseId: text("prerequisiteCourseId").references(() => pipelineCourses.id, { onDelete: "set null" }),
  prerequisiteText: text("prerequisiteText").notNull(), // Exact text from source
  confidence: pipelineConfidenceLevel("confidence"),
  evidenceId: text("evidenceId").references(() => pipelineExtractionEvidence.id, { onDelete: "set null" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

export const pipelineCollectionJobs = pgTable("pipeline_collection_job", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  universityId: text("universityId").references(() => pipelineUniversities.id, { onDelete: "cascade" }),
  programId: text("programId").references(() => pipelinePrograms.id, { onDelete: "cascade" }),
  status: pipelineJobStatus("status").notNull().default("pending"),
  retryCount: integer("retryCount").notNull().default(0),
  maxRetries: integer("maxRetries").notNull().default(3),
  priority: integer("priority").notNull().default(0),
  scheduledAt: timestamp("scheduledAt", { mode: "date" }).notNull().defaultNow(),
  startedAt: timestamp("startedAt", { mode: "date" }),
  completedAt: timestamp("completedAt", { mode: "date" }),
  error: text("error"),
  metadata: text("metadata"), // JSON string
}, (t) => [
  // Phase 3.5B-7 (missing enqueue boundary found by Controlled Live Pilot
  // Stage 1): at most one ACTIVE collection job per logical
  // (universityId, COALESCE(programId, '')) target — same pattern/rationale
  // as pipeline_source_one_active_per_target. "Active" here means anything
  // claimNextJob() (jobs/claim.ts) could still select today: the five
  // in-flight statuses (regardless of staleness — a stale job is still this
  // target's job, due for automatic reclaim, not grounds for a second
  // competing job) OR 'failed' while retries remain. 'completed' and
  // 'cancelled' are excluded, and so are 'source_found' and 'needs_review'
  // — both defined in the pipeline_job_status enum but never produced by
  // process.ts and never matched by claimNextJob()'s own WHERE clause, so a
  // job stuck in either is exactly as unreachable to the processor as
  // 'completed' is. COALESCE(programId, '') closes the same NULL-distinctness
  // hole already handled identically for pipelineSources — programId is
  // genuinely nullable here too (university-level jobs).
  uniqueIndex("pipeline_collection_job_one_active_per_target")
    .on(t.universityId, sql`COALESCE(${t.programId}, '')`)
    .where(sql`
      ${t.status} IN ('pending','searching','downloading','parsing','extracting','validating')
      OR (${t.status} = 'failed' AND ${t.retryCount} < ${t.maxRetries})
    `),
]);

export const pipelineReviewQueue = pgTable("pipeline_review_queue", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  curriculumVersionId: text("curriculumVersionId").references(() => pipelineCurriculumVersions.id, { onDelete: "cascade" }),
  extractionRunId: text("extractionRunId").references(() => pipelineExtractionRuns.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(), // e.g. "no official source", "conflicting sources"
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reviewedBy: text("reviewedBy").references(() => users.id, { onDelete: "set null" }),
  reviewedAt: timestamp("reviewedAt", { mode: "date" }),
  reviewNotes: text("reviewNotes"),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});

// ── Lesson quizzes & the per-track final exam ─────────────────────────
// Server-graded, per-attempt tracking. Question banks (text + correct answer
// + explanation) live as server-only JSON files under src/content/quiz-bank/
// (never imported by any "use client" file — see src/lib/quiz-bank.ts), so
// these rows only ever hold WHICH question ids were shown (in what shuffled
// order) and WHAT the learner answered — never the questions/answers
// themselves. Grading always re-derives correctness from the bank at submit
// time; a client-reported score is never trusted (see
// docs/html-quiz-security.md for the full threat model).
export const quizAttemptStatus = pgEnum("quiz_attempt_status", [
  "in_progress",
  "graded",
]);

// One row per lesson-quiz attempt (5 questions, pass = 4/5). No separate
// "lesson complete" flag: a lesson counts as passed iff a graded, passed
// attempt exists for (userId, track, lessonSlug) — derived, not stored, so
// there is exactly one source of truth.
export const lessonQuizAttempts = pgTable(
  "lesson_quiz_attempt",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    track: text("track").notNull(),
    lessonSlug: text("lessonSlug").notNull(),
    questionIds: text("questionIds").notNull(), // JSON string[] — snapshot, shown order
    optionOrder: text("optionOrder").notNull(), // JSON { [questionId]: number[] } shuffled option->original index
    answers: text("answers").notNull().default("{}"), // JSON { [questionId]: number } selected option index
    status: quizAttemptStatus("status").notNull().default("in_progress"),
    score: integer("score"), // set on grading
    total: integer("total").notNull().default(5),
    passed: boolean("passed"), // set on grading
    startedAt: timestamp("startedAt", { mode: "date" }).notNull().defaultNow(),
    submittedAt: timestamp("submittedAt", { mode: "date" }),
  },
  (t) => [
    index("lesson_quiz_attempt_user_lesson_idx").on(
      t.userId,
      t.track,
      t.lessonSlug
    ),
    uniqueIndex("lesson_quiz_attempt_one_in_progress_per_lesson")
      .on(t.userId, t.track, t.lessonSlug)
      .where(sql`${t.status} = 'in_progress'`),
  ]
);

// One row per final-exam attempt (40 questions from an 80+ bank, pass =
// 32/40). `expiresAt` is the server-enforced 50-minute deadline set at start;
// `answers` is updated incrementally by autosave while in_progress. An
// in_progress row past `expiresAt` is lazily graded (whatever was
// autosaved) the next time it's read/acted on — see
// src/app/exam/[tech]/actions.ts.
export const examAttempts = pgTable(
  "exam_attempt",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    track: text("track").notNull(),
    questionIds: text("questionIds").notNull(), // JSON string[] — snapshot, 40 ids
    optionOrder: text("optionOrder").notNull(), // JSON { [questionId]: number[] }
    answers: text("answers").notNull().default("{}"), // JSON { [questionId]: number }
    status: quizAttemptStatus("status").notNull().default("in_progress"),
    score: integer("score"),
    total: integer("total").notNull().default(40),
    passed: boolean("passed"),
    startedAt: timestamp("startedAt", { mode: "date" }).notNull().defaultNow(),
    expiresAt: timestamp("expiresAt", { mode: "date" }).notNull(),
    submittedAt: timestamp("submittedAt", { mode: "date" }),
  },
  (t) => [
    index("exam_attempt_user_track_idx").on(t.userId, t.track),
    index("exam_attempt_user_track_status_idx").on(
      t.userId,
      t.track,
      t.status
    ),
    uniqueIndex("exam_attempt_one_in_progress_per_track")
      .on(t.userId, t.track)
      .where(sql`${t.status} = 'in_progress'`),
  ]
);

export type LessonQuizAttempt = typeof lessonQuizAttempts.$inferSelect;
export type ExamAttempt = typeof examAttempts.$inferSelect;

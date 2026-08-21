import {
  pgTable,
  pgEnum,
  text,
  integer,
  timestamp,
  primaryKey,
  boolean,
  unique,
  index,
} from "drizzle-orm/pg-core";
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
  data: text("data").notNull().default("{}"), // JSON: { completedLessons, quizzes }
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

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
    totalCreditHours: integer("totalCreditHours").notNull().default(0),
    source: text("source").notNull().default(""),
    sourceDate: text("sourceDate").notNull().default(""),
    generalNote: text("generalNote"),
    categories: text("categories").notNull().default("[]"), // JSON: StudyPlanCategory[]
    createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
  },
  (t) => [
    unique("academic_study_plan_key").on(
      t.country,
      t.university,
      t.specialization
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
  domain: text("domain"),
  sourceType: pipelineSourceType("sourceType").notNull(),
  title: text("title"),
  discoveredAt: timestamp("discoveredAt", { mode: "date" }).notNull().defaultNow(),
  lastCheckedAt: timestamp("lastCheckedAt", { mode: "date" }),
  contentHash: text("contentHash"),
  status: text("status").notNull().default("active"),
  credibilityScore: integer("credibilityScore").notNull().default(0), // 0-100
});

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
});

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
});

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
});

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
  credits: integer("credits"),
  theoreticalCredits: integer("theoreticalCredits"),
  practicalCredits: integer("practicalCredits"),
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
});

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

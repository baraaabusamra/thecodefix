import {
  pgTable,
  pgEnum,
  text,
  integer,
  timestamp,
  primaryKey,
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Organization = typeof organizations.$inferSelect;

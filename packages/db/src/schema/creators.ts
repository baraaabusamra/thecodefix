// Creator hub: creator pages, their posts, and notifications.
//
// Extracted from the single src/db/schema.ts in Phase 2. That file is still
// the public entry point. No table, column, SQL type, default, index,
// constraint or enum value changed in the move.

import {
  pgTable,
  pgEnum,
  text,
  integer,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

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

export type Creator = typeof creators.$inferSelect;
export type NewCreator = typeof creators.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;

// Authored content: CMS tracks/lessons that the public site merges with the
// MDX files, visitor suggestions, and the SEO keyword tracker that targets
// those same pages.
//
// Extracted from the single packages/db/src/schema.ts in Phase 2. That file is still
// the public entry point. No table, column, SQL type, default, index,
// constraint or enum value changed in the move.

import {
  pgTable,
  pgEnum,
  text,
  integer,
  timestamp,
  boolean,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

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
// with the existing file-based tracks (content/ar/tracks). DB content is
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

export type Suggestion = typeof suggestions.$inferSelect;
export type ContentTrack = typeof contentTracks.$inferSelect;
export type ContentLesson = typeof contentLessons.$inferSelect;
export type SeoKeyword = typeof seoKeywords.$inferSelect;

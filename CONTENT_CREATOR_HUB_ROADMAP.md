# Content Creator Hub — Architecture Roadmap

> Portal for programming content creators to register, submit, and display video content from YouTube, Instagram, TikTok, and Facebook.
> Integrated with [thecodefix.net](https://thecodefix.net) — dark theme (`#07060a` / `#b026ff`), Next.js 16 + React 19 + TypeScript + Drizzle ORM + Neon Postgres.

---

## Phase 0: Foundation & Schema Design

**Rule files enforced:**
| Rule File | Why |
|-----------|-----|
| `security-devsecops-ssdls-appsec.mdc` | Input validation for video URLs, RBAC enforcement, parameterized queries |
| `typescript-code-convention-cursorrules-prompt-file.mdc` | Interfaces > types, strict mode, no `any` |
| `clean-code.mdc` | Single-responsibility for each DB service, meaningful names |
| `nextjs-react-tailwind-cursorrules-prompt-file.mdc` | File organization under `src/`, lowercase-dash directories |

**Database schema additions** (`packages/db/src/schema.ts`):

```typescript
// ── Content Creator Hub ──────────────────────────────────────────
export const creatorPlatform = pgEnum("creator_platform", [
  "youtube", "instagram", "tiktok", "facebook"
]);

export const submissionStatus = pgEnum("submission_status", [
  "pending",       // قيد المراجعة
  "approved",      // تمت الموافقة
  "rejected",      // مرفوض
  "needs_revision",// بحاجة لتعديل
]);

export const creators = pgTable("creator", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  displayName: text("displayName").notNull(),
  bio: text("bio"),
  avatar: text("avatar"),
  website: text("website"),
  platforms: text("platforms").notNull().default("[]"), // JSON array of {platform, url}
  socialLinks: text("socialLinks").default("{}"),       // JSON
  status: text("status").notNull().default("active"),    // active | suspended
  totalSubmissions: integer("totalSubmissions").notNull().default(0),
  approvedSubmissions: integer("approvedSubmissions").notNull().default(0),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const videoSubmissions = pgTable("video_submission", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  creatorId: text("creatorId").notNull().references(() => creators.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  platform: creatorPlatform("platform").notNull(),
  videoUrl: text("videoUrl").notNull(),
  thumbnail: text("thumbnail"),
  duration: integer("duration"),              // seconds
  hashtags: text("hashtags").default(""),     // comma-separated
  status: submissionStatus("status").notNull().default("pending"),
  reviewedBy: text("reviewedBy").references(() => users.id, { onDelete: "set null" }),
  reviewNote: text("reviewNote"),
  reviewedAt: timestamp("reviewedAt", { mode: "date" }),
  publishedAt: timestamp("publishedAt", { mode: "date" }),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).notNull().defaultNow(),
});

export const notifications = pgTable("notification", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),               // submission.received | approved | rejected | needs_revision
  title: text("title").notNull(),
  body: text("body"),
  link: text("link"),                         // deep-link to the submission
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("createdAt", { mode: "date" }).notNull().defaultNow(),
});
```

### Phase 0 — Step-by-Step Execution Plan

#### 0.1 Schema Extensions (`packages/db/src/schema.ts`)

**New enums:**
- `creator_platform`: `youtube`, `instagram`, `tiktok`, `facebook`
- `submission_status`: `pending`, `approved`, `rejected`, `needs_revision`

**New tables & constraints:**

| Table | Key Columns | Constraints & Indexes |
|-------|-------------|----------------------|
| `creator` | `id` (PK, UUID), `userId` (FK→users, UNIQUE), `displayName` (NOT NULL), `bio`, `avatar`, `website`, `platforms` (JSON), `socialLinks` (JSON), `status` (default `active`), `totalSubmissions`, `approvedSubmissions`, timestamps | FK `userId` → `users.id` ON DELETE CASCADE, UNIQUE `userId`, NOT NULL `displayName` |
| `video_submission` | `id` (PK, UUID), `creatorId` (FK→creators), `title` (NOT NULL), `description`, `platform` (enum), `videoUrl` (NOT NULL), `thumbnail`, `duration`, `hashtags`, `status` (default `pending`), `reviewedBy` (FK→users), `reviewNote`, `reviewedAt`, `publishedAt`, timestamps | FK `creatorId` → `creators.id` ON DELETE CASCADE, FK `reviewedBy` → `users.id`, INDEX on `status`, INDEX on `creatorId` |
| `notification` | `id` (PK, UUID), `userId` (FK→users), `type` (NOT NULL), `title` (NOT NULL), `body`, `link`, `read` (default `false`), `createdAt` | FK `userId` → `users.id` ON DELETE CASCADE, INDEX on `(userId, read)` |

#### 0.2 Migration Commands

```bash
npm run db:generate       # Generate SQL migration
npm run db:migrate        # Apply to database (uses DATABASE_URL_UNPOOLED)
npm run db:studio         # Visual verification
npm run build             # TypeScript check
```

#### 0.3 Data Access Layer (`modules/creators/src/creators.ts`)

- Single-responsibility exported functions (no classes)
- Five query functions, three mutation functions, two aggregation functions
- All DB access via Drizzle ORM (parameterized queries, no raw SQL)
- Exported types: `CreatorListOptions`

#### 0.4 Notification Service (`modules/creators/src/notifications.ts`)

- Factory functions for each notification event type
- Admin notification target: all users with `admin` or `operations` role
- Creator notifications target: the `userId` from the `creators` table

#### 0.5 RBAC Extension (`packages/identity/src/rbac.ts`)

- New capability: `"creators:review"`
- Granted to: `admin`, `writer`, `operations` roles

#### 0.6 Security & Performance Checklist

- [x] All IDs use `crypto.randomUUID()` (consistent with existing schema)
- [x] All FKs have `ON DELETE CASCADE` or `SET NULL` as appropriate
- [x] Index on `video_submission.status` for admin queue performance
- [x] Index on `notifications (userId, read)` for unread badge queries
- [x] No raw SQL — all queries through Drizzle ORM
- [x] Application-level URL validation per platform (Phase 2 Zod schemas)
- [x] RBAC gating on all admin mutation endpoints

---

## Phase 1: Creator Registration & Auth Integration

**Rule files enforced:**
| Rule File | Why |
|-----------|-----|
| `react-zustand-cursorrules-prompt-file.mdc` | Client-side form state management (if needed) |
| `security-devsecops-ssdls-appsec.mdc` | OAuth-only auth (reuse existing Auth.js), URL validation |
| `git-conventional-commit-messages.mdc` | `feat(creators): add registration flow` |

**Files to create:**
- `apps/web/src/app/creators/register/page.tsx` — Registration form (RSC + server action)
- `modules/creators/src/actions/register.ts` — Server action: `registerCreator`
- `modules/creators/src/creators.ts` — Creator data access layer (Drizzle queries)
- `modules/creators/src/notifications.ts` — Notification service
- `modules/creators/src/ui/CreatorRegisterForm.tsx` — Client form component
- `apps/web/src/app/api/creators/route.ts` — API route if needed for external tools

**Workflow:**
1. User must be logged in (reuse `auth.ts` session)
2. Form collects: display name, bio, platform handles, website
3. Server action validates with Zod, inserts into `creators` table
4. Notification sent to admin (`type: "creator.registered"`)
5. Creator redirected to dashboard

---

## Phase 2: Video Submission Flow

**Rule files enforced:**
| Rule File | Why |
|-----------|-----|
| `nextjs-react-typescript-cursorrules-prompt-file.mdc` | `useActionState` for form errors, Zod validation |
| `security-devsecops-ssdls-appsec.mdc` | Video URL sanitization, no HTML injection in descriptions |
| `react-typescript-nextjs-nodejs-cursorrules-prompt-.mdc` | Server actions via `useActionState`, not try/catch for expected errors |

**Files to create:**
- `apps/web/src/app/creators/submit/page.tsx` — Submission form
- `modules/creators/src/actions/submit.ts` — Server action: `submitVideo`
- `apps/web/src/app/creators/submissions/page.tsx` — Creator's submission list
- `modules/creators/src/ui/VideoSubmissionForm.tsx`
- `modules/creators/src/ui/SubmissionCard.tsx`
- `modules/creators/src/ui/SubmissionStatusBadge.tsx`

**Validation rules (Zod):**
- `title`: 3-200 chars, Arabic/English allowed
- `videoUrl`: Must match YouTube/Instagram/TikTok/Facebook URL patterns
- `platform`: Must match the URL's platform
- `hashtags`: Max 10, alphanumeric + Arabic chars

**Submission workflow:**
1. Creator picks platform → provides URL + title + description + hashtags
2. Server action auto-detects platform from URL, validates
3. Insert into `video_submissions` with `status: "pending"`
4. Notification inserted: `type: "submission.received"` for both creator and admin

---

## Phase 3: Review System (Admin Side)

**Rule files enforced:**
| Rule File | Why |
|-----------|-----|
| `pr-review-cursorrules-prompt-file.mdc` | Review workflow mirrors PR review discipline |
| `security-devsecops-ssdls-appsec.mdc` | RBAC check: only admin/writer/operations roles can review |
| `anti-sycophancy-code-discipline-cursorrules-prompt-file.mdc` | Hard invariants on status transitions |

**Files to create:**
- `apps/web/src/app/admin/creators/page.tsx` — All creators list
- `apps/web/src/app/admin/creators/[id]/page.tsx` — Creator detail + submissions
- `apps/web/src/app/admin/creators/submissions/page.tsx` — Submission queue (filterable by status)
- `apps/web/src/app/admin/creators/submissions/[id]/page.tsx` — Review detail page
- `modules/creators/src/actions/admin-review.ts` — `approveSubmission`, `rejectSubmission`, `requestRevision`
- `modules/creators/src/ui/SubmissionReviewPanel.tsx`

**Status transition rules (invariants):**
- `pending` → `approved` | `rejected` | `needs_revision`
- `needs_revision` → `pending` (creator resubmits) | `approved` | `rejected`
- `approved` / `rejected` → terminal (no further transitions)

**Admin review UI:**
- Preview embedded video (if URL supports oEmbed or iframe embed)
- Submission metadata panel (platform, hashtags, timestamps)
- Review action buttons + textarea for notes
- Audit log entry on each action

---

## Phase 4: Creator Dashboard & Public Gallery

**Rule files enforced:**
| Rule File | Why |
|-----------|-----|
| `nextjs-seo-dev-cursorrules-prompt-file.mdc` | Gallery pages need SEO metadata, JSON-LD |
| `web-app-optimization-cursorrules-prompt-file.mdc` | Image lazy-loading for video thumbnails, pagination |
| `tailwind-css-nextjs-guide-cursorrules-prompt-file.mdc` | Mobile-first gallery grid, responsive design |

**Files to create:**
- `apps/web/src/app/creators/dashboard/page.tsx` — Creator hub (stats, notifications, recent submissions)
- `apps/web/src/app/creators/gallery/page.tsx` — Public showcase of approved videos
- `apps/web/src/app/creators/[displayName]/page.tsx` — Public creator profile page
- `modules/creators/src/ui/CreatorDashboard.tsx`
- `modules/creators/src/ui/VideoGallery.tsx`
- `modules/creators/src/ui/CreatorProfileCard.tsx`
- `modules/creators/src/ui/NotificationBell.tsx` — Reusable notification component

**Dashboard features:**
- Submission count + approval rate
- Notification list (unread indicator)
- Quick-submit button
- Recent submissions with status badges

**Gallery features:**
- Filter by platform (YouTube, Instagram, TikTok, Facebook)
- Search by title, creator, hashtag
- Grid layout (mobile-first, 1→2→3→4 columns)
- Each card: thumbnail, title, creator name, platform icon, view count placeholder

---

## Phase 5: Platform Integration & Architectural Linking

**Rule files enforced:**
| Rule File | Why |
|-----------|-----|
| `code-style-consistency-cursorrules-prompt-file.mdc` | Mirror existing patterns from `src/lib/admin-*.ts` for admin integration |
| `anti-sycophancy-code-discipline-cursorrules-prompt-file.mdc` | Verify library functions before use (e.g., if using oEmbed) |

**Integration points with existing platform:**

| Integration | Mechanism |
|-------------|-----------|
| **Auth** | Reuse `packages/identity/src/auth.ts` + `session` from `next-auth` — creator role extends existing `user_role` enum with `"creator"` |
| **Admin RBAC** | Extend `packages/identity/src/rbac.ts` — add capability `creators:review` to admin, writer, operations roles |
| **Admin nav** | Add "المبدعون" and "طلبات المراجعة" items to admin sidebar (`Sidebar.tsx`), gated by `creators:review` cap |
| **Notifications** | Notification table linked to existing `users.id` — unread count shown in `NotificationBell` on the creator dashboard; all notification types use Arabic messages |
| **Header/Nav** | Add "المبدعون" link in `Header.tsx` main nav + "🎬 منصة المبدعين" entry in `UserMenu.tsx` dropdown |
| **Globals CSS** | All new components use existing `btn-neon`, `card-glow`, `bg-surface/40`, `bg-surface/60`, `text-muted`, `border-border`, `bg-background`, `focus:border-accent` — no new theme tokens |
| **SEO** | Gallery pages get `CollectionPage` JSON-LD with `ItemList` + `VideoObject`; creator profiles get `ProfilePage` JSON-LD with `Person` |

**Route structure:**

```
apps/web/src/app/
  creators/                      ← New route group
    page.tsx                     → Redirects to /creators/gallery
    layout.tsx                   → Portal-specific layout (extends main layout with creator header/nav)
    register/
      page.tsx
    dashboard/
      page.tsx
    submit/
      page.tsx
    submissions/
      page.tsx
    gallery/
      page.tsx
    [displayName]/
      page.tsx                   → Public creator profile
  admin/
    creators/                    ← New admin section
      page.tsx                   → All creators (with search/filter/sort/pagination)
      submissions/
        page.tsx                 → Submission queue
        [id]/
          page.tsx               → Review detail
```

---

## Phase 6: Notifications & Polish

**Rule files enforced:**
| Rule File | Why |
|-----------|-----|
| `react-zustand-cursorrules-prompt-file.mdc` | Zustand store for unread notification count (if needed globally) |
| `web-app-optimization-cursorrules-prompt-file.mdc` | Lazy-load notification panel, paginate history |
| `git-conventional-commit-messages.mdc` | `feat(creators): add notification system` |

**Notification types:**
| Event | Notification to Creator | Notification to Admin |
|-------|------------------------|----------------------|
| Registration | "مرحبًا بك في منصة المبدعين!" | "مبدع جديد سجّل: {name}" |
| Submission received | "تم استلام الفيديو، قيد المراجعة" | طلب مراجعة جديد |
| Approved | "تمت الموافقة على فيديو: {title}" | — |
| Rejected | "لم تتم الموافقة على: {title}" + reason | — |
| Needs revision | "فيديو {title} بحاجة لتعديل" + notes | — |

---

## Summary Table: Phase → Files → Rules

| Phase | New Files | DB Tables | Key Rules |
|-------|-----------|-----------|-----------|
| 0 | (schema only) | `creator`, `video_submission`, `notification` | security, typescript-convention, clean-code |
| 1 | 5 files | — | security, zustand, git-conventional |
| 2 | 5 files | — | nextjs-react-typescript, security |
| 3 | 6 files | — | pr-review, security, anti-sycophancy |
| 4 | 6 files | — | seo, web-optimization, tailwind |
| 5 | 3 files (layout + nav edits) | user_role: "creator" migration | code-style-consistency, anti-sycophancy |
| 6 | 2 files (API route + cleanup) | — | zustand, web-optimization |

# Architecture Review — The Code Fix

**Date:** 2026-07-06 · **Scope:** full codebase (security & access control, performance, maintainability)
**Verdict:** The foundation is strong. RBAC is fail-closed and consistently enforced, Stripe webhooks are verified and idempotent, there is no SQL-injection surface, and public pages are deliberately static. The issues below are hardening and scaling work, not fires. Ordered by priority; safe to execute incrementally after the code freeze.

---

## What is already done right (no action needed)

- **RBAC**: capability model in `packages/identity/src/rbac.ts`; `can()` fails closed on missing role. Every admin page re-checks its capability; every admin server action is guarded. Operations role correctly cannot read/write payout data.
- **Stripe**: webhook signature verified, upsert keyed on `stripeSubscriptionId` (replay-safe), checkout requires session and stamps `userId` metadata.
- **Server actions**: `progress-actions.ts` and `certificate/actions.ts` derive userId from session (no IDOR); certificate issuance re-validates score server-side (no forged certs).
- **No raw SQL, no `NEXT_PUBLIC_` secret leaks, JSON-LD escapes `<`**, admin token compared in constant time, fail-closed in production when unset.
- **Rendering**: public pages static via `generateStaticParams`; `auth()` never called in public render paths. Keep it that way — nothing below may introduce dynamic rendering to public pages.
- **S5 (token fallback grants owner outside production)**: verified acceptable — Vercel preview/prod builds run `NODE_ENV=production`, so the open path only exists in local dev. No change.

---

## Phase A — Security hardening

### A1. Shared capability guard (closes the "forgotten check" gap)

**Problem:** the `resolveAdmin()` + `can()` pair is copy-pasted at the top of ~18 admin pages and ~8 action files. The admin layout only gates `admin:view`, so a new page that forgets its own check is reachable by any admin-capable role (e.g. `support`).

**Fix:** add two helpers to `packages/identity/src/admin-access.ts` and adopt them everywhere:

```ts
// packages/identity/src/admin-access.ts (append)
import { forbidden } from "next/navigation"; // check next docs; else throw

/** For server actions: throws unless the caller holds the capability. */
export async function requireCapability(cap: Capability): Promise<AdminAccess & { ok: true }> {
  const access = await resolveAdmin();
  if (!access.ok || !can(access.role, cap)) throw new Error("Forbidden");
  return access;
}

/** For admin pages: returns access or null; page renders <Forbidden/> on null. */
export async function pageCapability(cap: Capability) {
  const access = await resolveAdmin();
  return access.ok && can(access.role, cap) ? access : null;
}
```

Then each action file's guard becomes one line: `const access = await requireCapability("content:edit");` — and each page: `const access = await pageCapability("ops:manage"); if (!access) return <Forbidden/>;`

Mechanical replacement, no behavior change. Files: all `apps/web/src/app/admin/**/actions.ts` and `apps/web/src/app/admin/**/page.tsx`, plus `modules/admin/src/operations.ts` (`assertOps`).

### A2. Rate limiting (currently: none anywhere)

Exposed: `submitSuggestion` (anonymous, honeypot only), `api/checkout`, `issueCertificate`, `saveMyProgress`.

**Recommended, zero new infra:** two layers.

1. **Vercel WAF rate-limit rules** (dashboard, no code): limit POSTs per IP on `/api/checkout` and the server-action endpoint paths. This is the durable layer.
2. **In-code minimal limiter** for `submitSuggestion` — a module-level sliding window. On Fluid Compute instances are reused across requests, so an in-memory map is meaningfully effective (not perfect — per-instance), and is the right cost/benefit before adding Upstash:

```ts
// packages/core/src/rate-limit.ts
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) return false;
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 10_000) hits.clear(); // memory cap
  return true;
}
```

Use in `suggest-actions.ts` keyed on IP (`headers().get("x-forwarded-for")`), e.g. 5 submissions / 10 min. Return the same generic result on limit (keeps the no-oracle property). Upgrade path: swap internals for Upstash Redis via Vercel Marketplace if abuse actually appears.

### A3. Content-Security-Policy

`apps/web/next.config.ts` has good headers but no CSP (blocked by the inline theme script in `apps/web/src/app/layout.tsx:99`). Plan:

1. Compute the SHA-256 hash of the static `themeScript` string and allow it via `'sha256-…'` (script is a constant — hash is stable per deploy; add a tiny build check or compute once manually).
2. Required allowances: `script-src 'self' 'sha256-<theme>' https://cdn.jsdelivr.net` (Monaco loader + Pyodide), `va.vercel-scripts.com` (analytics); `worker-src 'self' blob:` (py-worker); `connect-src 'self' https://cdn.jsdelivr.net`; `style-src 'self' 'unsafe-inline'` (Monaco injects styles; revisit later); `img-src 'self' data: blob:`; `frame-ancestors 'self'`.
3. **Ship as `Content-Security-Policy-Report-Only` first**, watch the console/reports for a week on real pages (especially playground + lesson pages), then enforce.

This is the highest-effort security item; Report-Only makes it zero-risk to start.

### A4. Pro entitlement seam

The `subscriptions` table is written by the webhook but never read outside admin billing — Pro is sold but grants nothing technically. Before any gated content ships, add the read seam now:

```ts
// src/lib/entitlements.ts
import { cache } from "react";
export const getEntitlement = cache(async (userId: string) => {
  if (!db) return { pro: false };
  const [sub] = await db.select({ status: subscriptions.status, end: subscriptions.currentPeriodEnd })
    .from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  const pro = !!sub && (sub.status === "active" || sub.status === "trialing");
  return { pro };
});
```

Gating hooks in later at the **server action / dynamic page level only** (e.g. certificate PDF export, future pro lessons) — never in static public page render paths.

---

## Phase B — Performance

### B1. `searchLessons` — the worst runtime hotspot

`/search` is dynamic (reads `searchParams`), and every request re-reads and front-matter-parses **all 768 MDX files** (`fileTracks`/`fileLessons` in `packages/content/src/tracks.ts` are not memoized) plus `SELECT *` of all DB lessons including full MDX bodies.

**Fix (three small changes in `packages/content/src/tracks.ts`):**

1. Module-level memo for file readers — files are immutable in a deployed build:

```ts
let _fileTracks: TrackMeta[] | null = null;
function fileTracks(): TrackMeta[] {
  if (_fileTracks) return _fileTracks;
  /* existing body */
  return (_fileTracks = result);
}
// same pattern for fileLessons, keyed per track: Map<string, LessonSummary[]>
// In dev, skip the memo when process.env.NODE_ENV === "development" so edits show up.
```

2. Add a slim DB projection for search/list paths — a second cached reader that selects only `track, slug, title, description, order, keywords` (no `content` column). Keep the existing full reader for `getLesson`.
3. Build the search index once per instance: memoize the flattened `{track, trackTitle, haystack, lesson}` array; `searchLessons` then just filters strings — microseconds instead of hundreds of ms + DB round-trip.

### B2. `getLesson` DB path — targeted query

Replace "load all published lessons, `.find()`" (`content.ts:162`) with:

```ts
const [row] = await db.select().from(contentLessons)
  .where(and(eq(contentLessons.track, track), eq(contentLessons.slug, slug),
             eq(contentLessons.published, true)))
  .limit(1);
```

The `unique(track, slug)` constraint already backs this with an index.

### B3. Debounce `saveMyProgress`

Every lesson toggle fires the server action immediately (`modules/progress/src/progress.ts:41`), and each call costs an `auth()` DB session lookup + upsert. Add a 2s trailing debounce in `write()`:

```ts
let timer: ReturnType<typeof setTimeout> | undefined;
let pending: Progress | null = null;
function scheduleSync(p: Progress) {
  pending = p;
  clearTimeout(timer);
  timer = setTimeout(() => { const x = pending; pending = null;
    if (x) saveMyProgress(x).catch(() => {}); }, 2000);
}
// plus a `flush` on pagehide/visibilitychange so the last write isn't lost on tab close
```

Last-write-wins is already the semantics (whole-blob upsert), so this is safe.

### B4. Secondary indexes migration

`packages/db/src/schema.ts` defines zero secondary indexes. Add (drizzle `index()` + `npm run db:generate` / `db:migrate`):

- `subscriptions.userId`, `certificates.userId`, `auditLogs.userId`
- `tickets.status`, `tickets.assigneeId`, `ticketReplies.ticketId`
- `contentLessons.published`

Low volume today; cheap to add now, painful to notice later. Pure additive migration — no data risk.

### B5. Lazy-load the Playground

`modules/learning/src/ui/Mdx.tsx` statically imports `Playground.tsx` (425 lines + Monaco wrapper) into the component map, shipping it with **every** lesson bundle. Wrap it:

```ts
// modules/learning/src/ui/Mdx.tsx
import dynamic from "next/dynamic";
const Playground = dynamic(() => import("./Playground"), { ssr: false,
  loading: () => <div className="playground-skeleton" /> });
```

(Verify the exact `next/dynamic` API against `node_modules/next/dist/docs/` — this Next version has breaking changes.)

### B6. Minor

- `apps/web/src/app/admin/users/page.tsx:28-29`: `Promise.all([listUsers(), listProgressStats()])`.
- `/verify`: wrap `findCertificate` in React `cache()` so `generateMetadata` + page body share one query.

---

## Phase C — Maintainability foundations

### C1. Error boundaries (biggest resilience gap)

Only `not-found.tsx` exists. Add:

- `apps/web/src/app/error.tsx` — Arabic RTL client component matching the neon brand: "حدث خطأ غير متوقع" + retry button (`reset()`), link home.
- `apps/web/src/app/admin/error.tsx` — same but with the thrown message surfaced (admin actions throw `"Forbidden"` / Arabic validation strings today; without this, users get the raw Next error page).

### C2. Metadata factory — adopt-on-touch

~45 files hand-roll `metadata`; `packages/content/src/seo.ts` only covers keywords. Add `buildMetadata({ title, description, path, keywords? })` to `seo.ts` that returns the full object (title template, canonical, openGraph, twitter). **Do not migrate all 45 files now** (churn during freeze): migrate the top 5 traffic pages (home, learn track, lesson, blog post, search) and adopt on every future touch.

### C3. Minimal env validation

No new deps — a plain module that runs once and warns loudly on partial configuration, respecting the intentional "dormant until env set" design in `flags.ts`:

```ts
// src/lib/env.ts — imported once from root layout (server)
const GROUPS = {
  auth: ["AUTH_SECRET"], db: ["DATABASE_URL"],
  stripe: ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_ID"],
} as const;
for (const [group, keys] of Object.entries(GROUPS)) {
  const set = keys.filter((k) => process.env[k]);
  if (set.length > 0 && set.length < keys.length)
    console.warn(`[env] ${group} partially configured — missing: ${keys.filter((k) => !process.env[k]).join(", ")}`);
}
```

Catches the real failure mode here: a feature half-enabled by a typo'd var.

### C4. Naming/data hygiene (disposition only, no urgency)

- `roadmap.ts` vs `roadmaps.ts`: rename one on next touch (e.g. `roadmap-data.ts`); add a header comment now pointing to the other.
- `changelog.ts` (301 lines of data-in-code): move to `src/content/changelog.json` whenever it next needs editing.

### C5. Smallest useful test harness

Vitest only (no E2E), targeting pure logic that guards money/access:

- `rbac.can()` — role×capability matrix, undefined role fails closed.
- `content.ts` merge logic — file overrides DB on slug collision, ordering.
- Certificate issuance validation — score/total bounds, pass ratio.
- `rate-limit.ts` (once A2 lands).

~1 day, gives regression cover exactly where mistakes are expensive.

---

## Suggested order of execution

| Step | Items | Effort | Risk |
|---|---|---|---|
| 1 | A1 guard helpers, B2 getLesson query, B6 minors | ~half day | trivial |
| 2 | B1 search memo/index, B4 DB indexes, C1 error.tsx | ~1 day | low |
| 3 | A2 rate limiting, B3 debounce, B5 dynamic Playground | ~1 day | low |
| 4 | C3 env warnings, C5 vitest harness, C2 metadata factory (5 pages) | ~1.5 days | low |
| 5 | A3 CSP (Report-Only → enforce), A4 entitlement seam | ~1 day + 1 week observation | medium (CSP) |

**Verification after each step:** `npm run build` must keep all lesson/track/quiz pages in the static output (watch the build summary — any page flipping to dynamic is a regression); manually exercise search, one lesson with playground, admin login per role, and a Stripe test-mode checkout.

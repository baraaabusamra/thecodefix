# Two-Tier Operations Design — Manager / Specialist

**Date:** 2026-07-06 · **Status:** design, not yet implemented
**Requirement:** one Operations Manager (`ops:manage`) with exclusive final-approval authority (publish content, activate instructor contracts, reassign/close tickets); multiple Operations Specialists (`ops:execute`) who execute day-to-day work and submit it for the Manager's review. `admin`/`owner` inherit the Manager tier.

**Design principle:** extend what exists. The `operations` role, `ops:manage` capability, `assertOps()` guard, `tickets.assigneeId`, and the `lessonStatus` editorial enum are all already in place — this design adds one role, one capability, three enum values, and five columns. No parallel structures.

---

## 1. Role hierarchy & access (RBAC)

### 1.1 `packages/identity/src/rbac.ts`

```ts
export const ROLES = [
  "student",
  "support",
  "writer",
  "sales",
  "ops_specialist", // NEW — operations day-to-day execution
  "operations",     // existing — becomes the Operations MANAGER
  "admin",
  "owner",
] as const;

export type Capability =
  | "admin:view"
  | "content:edit"
  | "users:manage"
  | "billing:manage"
  | "jobs:moderate"
  | "seo:manage"
  | "ops:execute" // NEW — draft replies, prep instructor files, submit lessons for review
  | "ops:manage"  // existing — approvals, publishing, activation, assignment, deletion
  | "settings:manage";

const ROLE_CAPABILITIES: Record<Role, Capability[]> = {
  // ...unchanged roles...
  ops_specialist: ["admin:view", "ops:execute"],
  operations:     ["admin:view", "ops:manage", "ops:execute"], // manager can also execute
  admin:  [/* existing */ , "ops:manage", "ops:execute"],
  owner:  [/* existing */ , "ops:manage", "ops:execute"],
};

export const ROLE_LABELS: Record<Role, string> = {
  // ...
  ops_specialist: "منفّذ عمليات",
  operations: "مدير العمليات",
};
```

Key decisions:
- **`operations` keeps its enum value and becomes the Manager** — no data migration for the existing operations user; only the label changes. The new `ops_specialist` role is purely additive.
- **`ops:manage` holders always also hold `ops:execute`** (declared explicitly in the capability sets, so `can()` stays a dumb lookup — no implication logic).
- **Operations *pages* re-gate on `ops:execute`** (both tiers can view); every *managerial action* gates on `ops:manage`. Today's pages check `ops:manage` — flip those page checks to `ops:execute`.

### 1.2 Enforcing "exactly ONE Manager"

This is org policy, enforced where roles are assigned — `modules/admin/src/actions/settings.ts` `updateUserRole` (owner-only already):

```ts
if (role === "operations") {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "operations"), ne(users.id, userId)))
    .limit(1);
  if (existing) redirect("/admin/settings?error=one-ops-manager");
}
```

`admin`/`owner` inheriting the tier doesn't violate the rule — they're above it, same as today.

---

## 2. Status lifecycles per module

Transitions are the security model: **each edge is labeled with the tier allowed to trigger it.** Everything not listed is forbidden for everyone.

### 2.1 Tickets (`ticket_status` — add `pending_approval`)

```
new ──(execute: start work)──▶ in_progress ──(execute: submit resolution)──▶ pending_approval
                                    ▲                                             │
                                    └──────(manage: reject, notes required)───────┤
closed ◀──(manage: approve & close)───────────────────────────────────────────────┘
closed ◀──(manage: close directly, any state)          closed ──(manage: reopen)──▶ in_progress
```

- Specialists **cannot reach `closed`** — only `pending_approval`.
- **Reassignment (`assigneeId`) and deletion: manager-only** (deletion already is).
- **Reply approval:** a specialist's *public* reply (`internal=false`) is created as `pending` and hidden from the requester until the Manager approves it. Internal notes and manager replies are `approved` immediately.

### 2.2 Content review (`lesson_status` — no new values needed)

The existing enum already models this; what changes is *who may trigger which edge*:

| From → To | Tier | Notes |
|---|---|---|
| `draft` → `review` | execute | "Submit for approval" — sets `submittedBy` |
| `review` → `draft` | execute | withdraw own submission / manager reject (notes required) |
| `review` → `published` | **manage** | the only edge that sets `published=true`; sets `approvedBy` |
| `published` → `suspended` | **manage** | |
| `suspended` → `review` \| `draft` | **manage** | |

`published` stays the single source of truth for public visibility (existing invariant in `setLessonWorkflow`) — and now only one manager-gated edge can set it.

### 2.3 Instructors (`instructor_status` — add `pending_activation`)

```
contacting ──(execute: file complete, contract uploaded)──▶ pending_activation
     ▲                                                            │
     └──(manage: reject, notes)───────────────────────────────────┤
signed ◀──(manage: approve contract)──────────────────────────────┘
signed ──(manage: activate)──▶ active ◀──(manage)──▶ paused
```

- Specialists prepare the record (name, specialty, contact, `contractUrl`, notes) while `contacting`, then submit.
- **Contract approval, activation, pausing: manager-only.**
- Finance fields (`payoutMethod`, `bankDetails`) remain **`billing:manage`-gated — even the Operations Manager cannot read them.** Do not weaken this existing rule.

---

## 3. Database schema updates (`packages/db/src/schema.ts`)

All additive — safe migration, no data rewrite.

```ts
// user_role: add the specialist tier
export const userRole = pgEnum("user_role", [
  "student", "support", "writer", "sales",
  "ops_specialist", // NEW — نفّذ مهام العمليات اليومية
  "operations",     // now: THE operations manager (exactly one)
  "admin", "owner",
]);

// ticket_status: add the approval gate
export const ticketStatus = pgEnum("ticket_status", [
  "new", "in_progress",
  "pending_approval", // NEW — بانتظار اعتماد المدير
  "closed",
]);

// NEW — reply approval state (specialist public replies await the manager)
export const replyApproval = pgEnum("reply_approval", [
  "pending",  // بانتظار الاعتماد — hidden from requester
  "approved", // معتمد
]);

// ticket_reply: append
approval: replyApproval("approval").notNull().default("approved"),
approvedBy: text("approvedBy").references(() => users.id, { onDelete: "set null" }),

// instructor_status: add the approval gate
export const instructorStatus = pgEnum("instructor_status", [
  "contacting",
  "pending_activation", // NEW — بانتظار اعتماد العقد
  "signed", "active", "paused",
]);

// instructor: append (delegation)
assignedTo: text("assignedTo").references(() => users.id, { onDelete: "set null" }),

// content_lesson: append (delegation + approval audit)
assignedTo:  text("assignedTo").references(() => users.id, { onDelete: "set null" }),
submittedBy: text("submittedBy").references(() => users.id, { onDelete: "set null" }),
approvedBy:  text("approvedBy").references(() => users.id, { onDelete: "set null" }),
```

Plus indexes on the new hot filters (folds into review item B4): `tickets.status`, `tickets.assigneeId`, `contentLessons.status`, `instructors.assignedTo`, `ticketReplies.ticketId`.

**Migration notes:**
- `npm run db:generate` produces `ALTER TYPE ... ADD VALUE` + `ALTER TABLE ... ADD COLUMN` — all additive. Postgres cannot *use* a new enum value in the same transaction that adds it; `scripts/migrate-http.mjs` runs statements individually over Neon HTTP, so this is a non-issue, but **don't seed new-status rows inside the same migration file**.
- Enum values are effectively permanent in Postgres (dropping requires type rebuild) — the names above are final, choose once.
- Tickets don't need `assignedTo`: **`assigneeId` already is the delegation column.**

---

## 4. Server-side security

### 4.1 Tiered guard — rework `assertOps` in `modules/admin/src/operations.ts`

```ts
export type OpsTier = "execute" | "manage";

/** Server Actions are public endpoints — re-verify capability before writes.
 *  Returns the actor's userId so actions can scope and audit. */
export async function assertOps(tier: OpsTier = "manage", extra?: Capability) {
  const access = await resolveAdmin();
  const cap: Capability = tier === "manage" ? "ops:manage" : "ops:execute";
  if (!access.ok || !can(access.role, cap)) throw new Error("Forbidden");
  if (extra && !can(access.role, extra)) throw new Error("Forbidden");
  const session = await auth();
  return {
    ...access,
    userId: session?.user?.id ?? null, // null in ADMIN_TOKEN fallback mode
    isManager: can(access.role, "ops:manage"),
  };
}
```

Default stays `"manage"`, so **every existing call site keeps its current (stricter) behavior until deliberately relaxed** — nothing silently opens up during rollout.

### 4.2 Transition tables — one place defines the lifecycle

```ts
// src/lib/ops-workflow.ts (new)
type Edge<S extends string> = { to: S; tier: OpsTier };

export const TICKET_TRANSITIONS: Record<string, Edge<TicketStatus>[]> = {
  new:              [{ to: "in_progress", tier: "execute" }, { to: "closed", tier: "manage" }],
  in_progress:      [{ to: "pending_approval", tier: "execute" }, { to: "closed", tier: "manage" }],
  pending_approval: [{ to: "closed", tier: "manage" }, { to: "in_progress", tier: "manage" }],
  closed:           [{ to: "in_progress", tier: "manage" }],
};

export function canTransition<S extends string>(
  table: Record<string, Edge<S>[]>, from: S, to: S, isManager: boolean
): boolean {
  const edge = table[from]?.find((e) => e.to === to);
  if (!edge) return false;
  return edge.tier === "execute" ? true : isManager; // manager holds execute too
}
```

Same-shaped tables for `LESSON_TRANSITIONS` (§2.2) and `INSTRUCTOR_TRANSITIONS` (§2.3). The UI reads the same tables to decide which buttons to render — **one definition, both layers.**

### 4.3 Rewritten `updateTicket` — the full pattern

Demonstrates all four checks a specialist cannot bypass: capability tier, assignment scope, legal transition, and compare-and-swap against races:

```ts
export async function updateTicket(formData: FormData) {
  const actor = await assertOps("execute"); // both tiers may enter
  const db = requireDb();

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const priority = String(formData.get("priority") ?? "");
  const assigneeId = String(formData.get("assigneeId") ?? "") || null;
  if (!id || !STATUSES.has(status) || !PRIORITIES.has(priority))
    throw new Error("Invalid input.");

  const [current] = await db
    .select({ status: tickets.status, assigneeId: tickets.assigneeId })
    .from(tickets).where(eq(tickets.id, id)).limit(1);
  if (!current) throw new Error("Not found.");

  // 1) Reassignment is a managerial act.
  if (assigneeId !== current.assigneeId && !actor.isManager)
    throw new Error("Forbidden");

  // 2) Specialists act only on tickets assigned to them.
  if (!actor.isManager && current.assigneeId !== actor.userId)
    throw new Error("Forbidden");

  // 3) The requested edge must exist for the actor's tier.
  if (status !== current.status &&
      !canTransition(TICKET_TRANSITIONS, current.status, status, actor.isManager))
    throw new Error("Forbidden");

  // 4) Compare-and-swap: if someone changed the status meanwhile, refuse
  //    instead of silently overwriting (two managers racing an approval).
  const updated = await db.update(tickets)
    .set({ status: status as TicketStatus, priority: priority as TicketPriority,
           assigneeId, updatedAt: new Date() })
    .where(and(eq(tickets.id, id), eq(tickets.status, current.status)))
    .returning({ id: tickets.id });
  if (!updated.length) redirect(`${LIST}/${id}?error=conflict`);

  await db.insert(auditLogs).values({
    userId: actor.userId, action: "ticket.status.update", target: id,
    meta: JSON.stringify({ from: current.status, to: status }),
  });
  revalidateTicket(id);
  redirect(`${LIST}/${id}?saved=1`);
}
```

### 4.4 Reply approval

```ts
export async function addTicketReply(formData: FormData) {
  const actor = await assertOps("execute");
  // ...existing parsing...
  const internal = formData.get("internal") === "on";
  // Specialist public replies await the manager; internal notes & manager
  // replies go out immediately.
  const approval = internal || actor.isManager ? "approved" : "pending";
  await db.insert(ticketReplies).values({ ticketId, body, internal,
    authorId: actor.userId, approval });
  // ...
}

export async function approveTicketReply(formData: FormData) {
  const actor = await assertOps("manage"); // manager only
  const id = String(formData.get("id") ?? "");
  const [row] = await db.update(ticketReplies)
    .set({ approval: "approved", approvedBy: actor.userId })
    .where(and(eq(ticketReplies.id, id), eq(ticketReplies.approval, "pending")))
    .returning({ ticketId: ticketReplies.ticketId });
  if (!row) throw new Error("Already handled.");
  await db.insert(auditLogs).values({ userId: actor.userId,
    action: "ticket.reply.approve", target: id });
  revalidateTicket(row.ticketId);
}
```

Any future requester-facing view of replies must filter `approval = 'approved' AND internal = false`.

### 4.5 Content publish — `setLessonWorkflow` split

Split the single do-everything action into tiered edges of `LESSON_TRANSITIONS`:

- `submitLessonForReview` — `assertOps("execute")`, CAS edge `draft → review`, stamps `submittedBy`.
- `approveLessonPublish` — `assertOps("manage")`, CAS edge `review → published`, sets `published: true` + `approvedBy`, then the existing `revalidatePath` fan-out (`/`, `/learn`, track, lesson, sitemap). **This is the only code path that may set `published: true`.**
- `rejectLesson` — `assertOps("manage")`, edge `review → draft`, **requires non-empty `reviewNotes`** so specialists always get actionable feedback.
- `suspendLesson` — `assertOps("manage")`.

Instructor actions follow identically: `submitInstructorForActivation` (execute, scoped to `assignedTo`), `approveInstructorContract` / `setInstructorActive` / `pauseInstructor` (manage). `updateInstructorPayout` keeps its existing `assertOps("manage", "billing:manage")` double gate.

---

## 5. UI/UX workflow

**Rule: render by capability, enforce by action.** Buttons are convenience; every action re-runs §4 checks — a specialist crafting a POST to `approveLessonPublish` hits `assertOps("manage")` and gets `Forbidden` regardless of what the UI showed.

### 5.1 Compute visibility server-side, once per page

Operations pages are server components — no client role checks, no flicker, role never shipped to the browser beyond what's rendered:

```tsx
// apps/web/src/app/admin/operations/tickets/[id]/page.tsx
const access = await pageCapability("ops:execute"); // both tiers view
if (!access) return <Forbidden />;
const isManager = can(access.role, "ops:manage");
const nextStates = (TICKET_TRANSITIONS[ticket.status] ?? [])
  .filter((e) => e.tier === "execute" || isManager); // same table as the backend
```

```tsx
{nextStates.some((e) => e.to === "pending_approval") && (
  <form action={updateTicket}>…<button>إرسال للاعتماد</button></form>
)}
{isManager && ticket.status === "pending_approval" && (
  <>
    <form action={updateTicket}>…<button className="btn-primary">اعتماد وإغلاق</button></form>
    <form action={updateTicket}>…<button className="btn-ghost">إرجاع للمعالجة</button></form>
  </>
)}
{/* Reassign select + delete: rendered only when isManager */}
```

### 5.2 Best practices applied to this flow

- **Hide vs. explain:** hide controls the role can *never* use (specialist never sees "Approve & Publish" or the reassign select). But when an item is *waiting on someone else*, show state, not absence: the specialist sees a disabled badge **"بانتظار اعتماد المدير"** on their submitted work — they know it's out of their hands, not broken.
- **One primary verb per state.** Specialist on `in_progress`: primary = "إرسال للاعتماد". Manager on `pending_approval`: primary = "اعتماد", secondary = "إرجاع مع ملاحظات". Never both tiers' buttons side by side.
- **Rejection requires notes** (`reviewNotes` non-empty, enforced server-side §4.5) — a rejected item must carry why.
- **Manager approval queue:** the operations dashboard (`admin/operations/page.tsx`) gets, for the manager only, a "بانتظار اعتمادك" section — counts + lists of `tickets.status = 'pending_approval'`, `content_lesson.status = 'review'`, `instructor.status = 'pending_activation'`. This is the single place approvals accumulate; specialists instead see "مهامي" filtered by `assigneeId`/`assignedTo = me`.
- **Status badges everywhere** with the existing Arabic labels + the new ones (`بانتظار الاعتماد` amber, `معتمد` green) so lists communicate workflow position at a glance.
- **Conflict feedback:** the CAS `?error=conflict` redirect surfaces as "سبقك شخص آخر بتحديث هذه الحالة — حدّث الصفحة" rather than silently losing a write.

---

## 6. Edge cases

| Case | Handling |
|---|---|
| Two managers approve the same item simultaneously | CAS `WHERE status = <expected>` (§4.3) — second write refuses with a visible conflict message |
| Specialist demoted / deleted mid-workflow | Per-request checks catch the demotion instantly; FK `onDelete: "set null"` leaves items unassigned; the manager queue is status-driven (not assignee-driven) so nothing gets lost |
| Specialist edits an unassigned ticket | Blocked by the scope check (§4.3 #2) — manager must assign first; this makes delegation explicit, not implicit |
| Owner assigns a second `operations` manager | Blocked in `updateUserRole` (§1.2) |
| `ADMIN_TOKEN` fallback mode (no DB user) | `resolveAdmin` grants synthetic `owner` ⇒ manager tier; `actor.userId` is `null` — audit rows record the action with null actor (already the existing behavior); acceptable since token mode only exists pre-provisioning |
| Requester-visible replies | Any future public ticket view must filter `approval='approved' AND internal=false` — noted in §4.4; today replies are admin-only so no leak exists |
| Old rows after migration | All existing tickets/instructors keep valid statuses (no value removed); existing replies default to `approved` — history unchanged |
| Enum permanence | New values (`pending_approval`, `pending_activation`, `ops_specialist`) can't be dropped later without a type rebuild — names are deliberate |

---

## 7. Rollout order (each step ships independently)

1. **Schema + RBAC** (§1, §3): new role/capability/enum values/columns + indexes; `npm run db:generate && npm run db:migrate:http`. Zero behavior change (nobody holds `ops_specialist` yet; `assertOps` defaults to `manage`).
2. **Guards + transition tables** (§4.1–4.2): rework `assertOps`, add `ops-workflow.ts`. Existing actions still call the manage tier — still zero behavior change.
3. **Tiered actions** (§4.3–4.5): rewrite ticket/content/instructor actions on the transition tables; flip operations *page* gates from `ops:manage` to `ops:execute`.
4. **UI** (§5): conditional buttons, manager approval queue, "مهامي" view, badges.
5. **Enforce single manager** (§1.2) + assign the first `ops_specialist` from Settings.

**Verify:** sign in as each of `ops_specialist` / `operations` / `admin` and walk one item per module through its full lifecycle; confirm a specialist's direct POST to a manage-tier action throws `Forbidden`; confirm the audit log records every transition; `npm run build` stays green with all public pages static.

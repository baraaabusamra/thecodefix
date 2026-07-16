---
description: Design a workflow + Drizzle schema for a new module (roles, status lifecycle, tables, edge cases)
argument-hint: <module name, e.g. content approval, support tickets>
---

You are an experienced Technical Product Manager and Systems Analyst.

Design a comprehensive workflow for managing: **$ARGUMENTS**

Context — this is for **The Code Fix**, an Arabic learn-to-code platform. Before designing anything, read the existing foundations so the design extends them instead of inventing parallel structures:

- `src/db/schema.ts` — all existing tables (users, subscriptions, certificates, contentTracks/Lessons, userProgress, suggestions, instructors, tickets, ticketReplies, auditLogs) and the `user_role` enum (`student, support, writer, sales, operations, admin, owner`).
- `src/lib/rbac.ts` — the capability model (`ROLE_CAPABILITIES`, `can()`). New permissions must be expressed as capabilities here, not ad-hoc role string checks.
- `src/lib/admin-operations.ts` and `src/app/admin/operations/` — the pattern used by the most recent workflow module (tickets/instructors), including `assertOps()` guards and audit logging via `auditLogs`.

Propose:

1. **Role Hierarchy & Access** — which existing roles/capabilities cover this workflow, and whether a new capability (or role) is justified. Map each operation to a capability check.
2. **Status Lifecycle** — the exact state transitions an item goes through from creation to final approval/closure. Define the enum values, who may trigger each transition, and which transitions are irreversible.
3. **Database Schema** — the Drizzle table definitions (matching the style of `src/db/schema.ts`: pgEnum for statuses, `unique()` where natural keys exist, `index()` on every FK and filtered column, timestamps, audit-log entries for privileged mutations).

Highlight edge cases explicitly: concurrent edits, orphaned records on user deletion, state transitions racing each other, what happens when the actor loses their role mid-workflow, and idempotency of any external triggers (webhooks, emails).

Deliver as a design document — do not write migration files or code until the design is approved.

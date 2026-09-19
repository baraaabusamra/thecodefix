// Billing: Stripe subscriptions plus webhook idempotency, and B2B
// organization seat allocation.
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
  index,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

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

export type Subscription = typeof subscriptions.$inferSelect;
export type Organization = typeof organizations.$inferSelect;

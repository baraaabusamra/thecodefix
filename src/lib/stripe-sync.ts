import type Stripe from "stripe";
import { eq, sql } from "drizzle-orm";
import type { db as appDb } from "@/db";
import { subscriptions, stripeEvents, users } from "@/db/schema";

// Stripe → database subscription sync (used by /api/stripe/webhook).
//
// Invariants:
//   1. Idempotent: an event id recorded in stripe_event is never processed
//      again. The marker is written only AFTER successful processing, so a
//      failure leaves nothing behind and Stripe's retry runs normally.
//   2. Canonical state: event payloads can be stale or arrive out of order,
//      so the subscription is always re-fetched from Stripe and THAT state is
//      written — never the payload's.
//   3. Monotonic: a write only applies when its Stripe fetch is at least as
//      fresh as the stored one (stripeSyncedAt), and a canceled subscription
//      is terminal (Stripe never reactivates one) — so a delayed or
//      concurrent handler can never resurrect access after a cancellation.
//   4. No orphans: a subscription is only stored for an existing user; an
//      existing row is never re-assigned to a different user.

type Db = NonNullable<typeof appDb>;
export type SubscriptionFetcher = Pick<Stripe["subscriptions"], "retrieve">;
export type DbStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete";

// Statuses that mean "this user already has a live subscription" — used to
// refuse a second checkout.
export const BLOCKING_STATUSES: DbStatus[] = ["active", "trialing", "past_due", "incomplete"];

export function mapStatus(status: Stripe.Subscription.Status): DbStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
    case "paused":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
    default:
      return "incomplete";
  }
}

export type SyncOutcome = "processed" | "duplicate" | "ignored" | "unmapped";

function subscriptionTarget(
  event: Stripe.Event
): { subscriptionId: string; fallbackUserId: string | null } | null {
  switch (event.type) {
    case "checkout.session.completed": {
      const cs = event.data.object as Stripe.Checkout.Session;
      if (cs.mode !== "subscription") return null;
      const subscriptionId =
        typeof cs.subscription === "string" ? cs.subscription : cs.subscription?.id;
      if (!subscriptionId) return null;
      return {
        subscriptionId,
        fallbackUserId: cs.metadata?.userId || cs.client_reference_id || null,
      };
    }
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return {
        subscriptionId: (event.data.object as Stripe.Subscription).id,
        fallbackUserId: null,
      };
    default:
      return null;
  }
}

async function fetchCanonicalSubscription(
  event: Stripe.Event,
  subscriptionId: string,
  fetcher: SubscriptionFetcher
): Promise<Stripe.Subscription> {
  try {
    return await fetcher.retrieve(subscriptionId);
  } catch (error) {
    // A deleted subscription may no longer be retrievable; its own deletion
    // event is then the most authoritative (and terminal) state available.
    const code = (error as { code?: string })?.code;
    if (event.type === "customer.subscription.deleted" && code === "resource_missing") {
      return { ...(event.data.object as Stripe.Subscription), status: "canceled" };
    }
    throw error;
  }
}

async function recordEvent(db: Db, event: Stripe.Event, outcome: Exclude<SyncOutcome, "duplicate">) {
  await db
    .insert(stripeEvents)
    .values({
      id: event.id,
      type: event.type,
      eventCreatedAt: new Date(event.created * 1000),
      outcome,
    })
    .onConflictDoNothing();
}

/**
 * Writes Stripe's canonical subscription state. Returns false when the
 * guarded upsert was refused as stale / after-cancellation.
 */
export async function upsertCanonicalSubscription(
  db: Db,
  input: {
    userId: string;
    stripeSubscriptionId: string;
    stripeCustomerId: string | null;
    status: DbStatus;
    currentPeriodEnd: Date | null;
    syncedAt: Date;
  }
): Promise<boolean> {
  const rows = await db
    .insert(subscriptions)
    .values({
      userId: input.userId,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      status: input.status,
      plan: "pro",
      currentPeriodEnd: input.currentPeriodEnd,
      stripeSyncedAt: input.syncedAt,
    })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      // userId is deliberately NOT updated: a row never changes owner.
      set: {
        status: input.status,
        currentPeriodEnd: input.currentPeriodEnd,
        stripeCustomerId: input.stripeCustomerId,
        stripeSyncedAt: input.syncedAt,
      },
      setWhere: sql`${subscriptions.status} <> 'canceled' AND (${subscriptions.stripeSyncedAt} IS NULL OR ${subscriptions.stripeSyncedAt} <= ${input.syncedAt})`,
    })
    .returning({ id: subscriptions.id });
  return rows.length > 0;
}

export async function handleStripeEvent(
  db: Db,
  fetcher: SubscriptionFetcher,
  event: Stripe.Event,
  now: () => Date = () => new Date()
): Promise<SyncOutcome> {
  const [seen] = await db
    .select({ id: stripeEvents.id })
    .from(stripeEvents)
    .where(eq(stripeEvents.id, event.id))
    .limit(1);
  if (seen) return "duplicate";

  const target = subscriptionTarget(event);
  if (!target) {
    await recordEvent(db, event, "ignored");
    return "ignored";
  }

  const syncedAt = now();
  const sub = await fetchCanonicalSubscription(event, target.subscriptionId, fetcher);

  // Owner resolution: an existing row keeps its owner; otherwise the userId
  // our checkout wrote into subscription metadata, else the session's.
  const [existing] = await db
    .select({ userId: subscriptions.userId })
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, sub.id))
    .limit(1);
  const metadataUserId = sub.metadata?.userId || null;
  const claimedUserId = existing?.userId ?? metadataUserId ?? target.fallbackUserId;
  const conflicting =
    !!metadataUserId && !!target.fallbackUserId && metadataUserId !== target.fallbackUserId;

  let userId: string | null = null;
  if (claimedUserId && !conflicting) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, claimedUserId))
      .limit(1);
    userId = user?.id ?? null;
  }
  if (!userId) {
    // Never create an orphan subscription row. Recorded so the event isn't
    // retried forever; the caller alerts so a human can reconcile.
    await recordEvent(db, event, "unmapped");
    return "unmapped";
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;
  // current_period_end lives on the subscription item in recent API versions,
  // and historically on the subscription itself — read either.
  const periodEndUnix =
    sub.items?.data?.[0]?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;

  await upsertCanonicalSubscription(db, {
    userId,
    stripeSubscriptionId: sub.id,
    stripeCustomerId: customerId,
    status: mapStatus(sub.status),
    currentPeriodEnd: typeof periodEndUnix === "number" ? new Date(periodEndUnix * 1000) : null,
    syncedAt,
  });
  await recordEvent(db, event, "processed");
  return "processed";
}

/**
 * Checkout guard: a live subscription for this user (if any) and the Stripe
 * customer to reuse, so a user can't start a second paid subscription and
 * isn't duplicated as a new Stripe customer.
 */
export async function getCheckoutState(db: Db, userId: string) {
  const rows = await db
    .select({
      status: subscriptions.status,
      stripeCustomerId: subscriptions.stripeCustomerId,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));
  const blocking = rows.some((r) => BLOCKING_STATUSES.includes(r.status));
  const customerId =
    rows
      .filter((r) => r.stripeCustomerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0]?.stripeCustomerId ?? null;
  return { hasLiveSubscription: blocking, customerId };
}

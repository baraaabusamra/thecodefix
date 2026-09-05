import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { captureServerError } from "@/lib/monitoring";

// Stripe webhook receiver. Activate by setting STRIPE_SECRET_KEY and
// STRIPE_WEBHOOK_SECRET, and pointing a Stripe webhook to /api/stripe/webhook.
// Recommended events: checkout.session.completed, customer.subscription.*

type DbStatus = "active" | "trialing" | "past_due" | "canceled" | "incomplete";

// Collapse Stripe's status set onto the billing_status enum used in our schema.
function mapStatus(status: Stripe.Subscription.Status): DbStatus {
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
      return "incomplete";
    default:
      return "incomplete";
  }
}

// Upsert a subscription row keyed by the (unique) Stripe subscription id, so the
// same subscription is created once and then kept in sync on later events.
async function upsertSubscription(
  sub: Stripe.Subscription,
  fallbackUserId?: string | null
) {
  if (!db) {
    await captureServerError(
      new Error("Stripe webhook cannot persist: database is unavailable"),
      { source: "stripe_webhook", operation: "persist_subscription" }
    );
    return;
  }

  const userId = sub.metadata?.userId || fallbackUserId || null;
  if (!userId) {
    // Without a user mapping we can't attribute the subscription; skip rather
    // than write an orphan row. (Checkout always sets metadata.userId.)
    await captureServerError(
      new Error("Stripe subscription is missing its account mapping"),
      { source: "stripe_webhook", operation: "map_subscription" }
    );
    return;
  }

  const customerId =
    typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

  // `current_period_end` lives on the subscription item in recent API versions,
  // and historically on the subscription itself — read either defensively.
  const periodEndUnix =
    sub.items?.data?.[0]?.current_period_end ??
    (sub as unknown as { current_period_end?: number }).current_period_end;
  const currentPeriodEnd =
    typeof periodEndUnix === "number" ? new Date(periodEndUnix * 1000) : null;

  const status = mapStatus(sub.status);

  await db
    .insert(subscriptions)
    .values({
      userId,
      stripeCustomerId: customerId,
      stripeSubscriptionId: sub.id,
      status,
      plan: "pro",
      currentPeriodEnd,
    })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: { status, currentPeriodEnd, stripeCustomerId: customerId },
    });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? "", webhookSecret);
  } catch (err) {
    await captureServerError(
      err,
      { source: "stripe_webhook", operation: "verify_signature" },
      { severity: "warning" }
    );
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Persist subscription state. A thrown error returns 500 so Stripe retries.
  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const cs = event.data.object as Stripe.Checkout.Session;
        const subId =
          typeof cs.subscription === "string"
            ? cs.subscription
            : cs.subscription?.id;
        const userId = cs.metadata?.userId || cs.client_reference_id || null;
        if (subId) {
          // Fetch the full subscription for its status and period end.
          const sub = await stripe.subscriptions.retrieve(subId);
          await upsertSubscription(sub, userId);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        // The deleted event carries status "canceled", so a plain upsert both
        // grants and revokes Pro access as the subscription's status changes.
        await upsertSubscription(event.data.object as Stripe.Subscription);
        break;
      }
      default:
        break;
    }
  } catch (err) {
    await captureServerError(err, {
      source: "stripe_webhook",
      operation: "handle_event",
      eventType: event.type,
    });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

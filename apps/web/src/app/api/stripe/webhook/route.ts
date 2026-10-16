import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@tcf/billing/stripe";
import { db } from "@tcf/db";
import { captureServerError } from "@tcf/observability/monitoring";
import { handleStripeEvent } from "@tcf/billing/stripe-sync";

// Stripe webhook receiver. Activate by setting STRIPE_SECRET_KEY and
// STRIPE_WEBHOOK_SECRET, and pointing a Stripe webhook to /api/stripe/webhook.
// Recommended events: checkout.session.completed, customer.subscription.*
//
// Verification happens here; all state logic (idempotency, canonical
// re-fetch, stale/out-of-order protection, user mapping) lives in
// src/lib/stripe-sync.ts. Any thrown error returns 500 so Stripe retries —
// and because the processed-event marker is written only after success, the
// retry is handled normally.

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
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

  if (!db) {
    // Without a database nothing can be persisted: fail so Stripe retries
    // once the database is back, instead of silently dropping the event.
    await captureServerError(
      new Error("Stripe webhook cannot persist: database is unavailable"),
      { source: "stripe_webhook", operation: "persist_subscription" }
    );
    return NextResponse.json({ error: "Database unavailable" }, { status: 500 });
  }

  try {
    const outcome = await handleStripeEvent(db, stripe.subscriptions, event);
    if (outcome === "unmapped") {
      await captureServerError(
        new Error("Stripe subscription has no valid account mapping"),
        { source: "stripe_webhook", operation: "map_subscription", eventType: event.type }
      );
    }
    return NextResponse.json({ received: true, outcome });
  } catch (err) {
    await captureServerError(err, {
      source: "stripe_webhook",
      operation: "handle_event",
      eventType: event.type,
    });
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }
}

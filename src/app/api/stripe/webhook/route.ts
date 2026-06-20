import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";

// Stripe webhook receiver. Activate by setting STRIPE_SECRET_KEY and
// STRIPE_WEBHOOK_SECRET, and pointing a Stripe webhook to /api/stripe/webhook.
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

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? "", webhookSecret);
  } catch (err) {
    console.error("Invalid Stripe webhook signature:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Handle the events you care about. Once you add a DB, mark the user as Pro.
  switch (event.type) {
    case "checkout.session.completed":
      // TODO: grant Pro access to the user (needs DB / user mapping)
      break;
    case "customer.subscription.deleted":
      // TODO: revoke Pro access
      break;
    default:
      break;
  }

  return NextResponse.json({ received: true });
}

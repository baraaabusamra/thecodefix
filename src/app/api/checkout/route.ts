import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";
import { auth } from "@/auth";
import { isAuthEnabled, isPaymentsEnabled } from "@/lib/flags";
import { rateLimit } from "@/lib/rate-limit";
import { captureServerError } from "@/lib/monitoring";

// Creates a Stripe Checkout session for the Pro subscription.
// Activate by setting STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID.
export async function POST() {
  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRO_PRICE_ID;

  // Server-side gate (hiding the button is not enough): no checkout while no
  // Pro feature is actually enforced — see ENFORCED_PRO_FEATURES in flags.ts.
  if (!isPaymentsEnabled() || !stripe || !priceId) {
    return NextResponse.json(
      { error: "المدفوعات غير مفعّلة بعد." },
      { status: 503 }
    );
  }

  // A subscription belongs to a user, so require a signed-in account before
  // creating a session. This stops anonymous callers from spinning up Stripe
  // sessions, and gives the webhook a stable user id to attribute the
  // resulting subscription to.
  if (!isAuthEnabled()) {
    return NextResponse.json(
      { error: "تسجيل الدخول غير مفعّل بعد." },
      { status: 503 }
    );
  }
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json(
      { error: "يجب تسجيل الدخول أولاً." },
      { status: 401 }
    );
  }

  if (!rateLimit(`checkout:${userId}`, 5, 60 * 1000)) {
    return NextResponse.json(
      { error: "محاولات كثيرة. حاول بعد قليل." },
      { status: 429 }
    );
  }

  try {
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      // Carry the user id on both the checkout session and the subscription it
      // creates, so every webhook event can be mapped back to this user.
      client_reference_id: userId,
      customer_email: session.user.email ?? undefined,
      metadata: { userId },
      subscription_data: { metadata: { userId } },
      success_url: `${SITE_URL}/account?upgraded=1`,
      cancel_url: `${SITE_URL}/pricing`,
    });
    return NextResponse.json({ url: checkout.url });
  } catch (err) {
    await captureServerError(err, {
      source: "stripe_checkout",
      operation: "create_checkout_session",
    });
    return NextResponse.json(
      { error: "تعذّر إنشاء جلسة الدفع." },
      { status: 500 }
    );
  }
}

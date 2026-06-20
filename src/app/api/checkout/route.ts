import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { SITE_URL } from "@/lib/site";

// Creates a Stripe Checkout session for the Pro subscription.
// Activate by setting STRIPE_SECRET_KEY and STRIPE_PRO_PRICE_ID.
export async function POST() {
  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRO_PRICE_ID;

  if (!stripe || !priceId) {
    return NextResponse.json(
      { error: "المدفوعات غير مفعّلة بعد." },
      { status: 503 }
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE_URL}/account?upgraded=1`,
      cancel_url: `${SITE_URL}/pricing`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Stripe checkout error:", err);
    return NextResponse.json(
      { error: "تعذّر إنشاء جلسة الدفع." },
      { status: 500 }
    );
  }
}

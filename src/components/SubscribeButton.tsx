"use client";

import { useState } from "react";
import { trackProductEvent } from "@/lib/analytics";

// Starts a Stripe Checkout session for the Pro plan. Rendered on the pricing
// page only when payments are enabled.
export default function SubscribeButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);

  async function subscribe() {
    trackProductEvent("pricing_cta_click", {
      plan: "pro",
      destination: "stripe_checkout",
    });
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url; // redirect to Stripe Checkout
      } else {
        alert(data.error ?? "تعذّر بدء الدفع.");
        setLoading(false);
      }
    } catch {
      alert("حدث خطأ. حاول مجددًا.");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={subscribe}
      disabled={loading}
      className="btn-neon w-full px-4 py-2.5 disabled:opacity-60"
    >
      {loading ? "...جارٍ التحويل" : label}
    </button>
  );
}

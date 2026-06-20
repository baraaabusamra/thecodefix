"use client";

import { useState } from "react";

// Starts a Stripe Checkout session for the Pro plan. Rendered on the pricing
// page only when payments are enabled.
export default function SubscribeButton({ label }: { label: string }) {
  const [loading, setLoading] = useState(false);

  async function subscribe() {
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
      className="w-full rounded-lg bg-brand-purple px-4 py-2 font-semibold text-white disabled:opacity-60"
    >
      {loading ? "...جارٍ التحويل" : label}
    </button>
  );
}

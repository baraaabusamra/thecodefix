"use client";

import { useState, useTransition } from "react";
import { trackProductEvent } from "@tcf/observability/analytics";
import { subscribeJobAlert } from "../actions/alerts";
import { SPECIALTIES } from "../search";

// Lead-capture card on a country jobs page: no real curated listings exist
// yet for most countries, so this turns interest into an audience list —
// useful leverage when reaching out to real employers later.
export default function JobAlertSignup({ country }: { country: string }) {
  const [email, setEmail] = useState("");
  const [specialty, setSpecialty] = useState("general");
  const [website, setWebsite] = useState(""); // honeypot
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);
    startTransition(async () => {
      const res = await subscribeJobAlert({ email, country, specialty, website });
      if (res.ok) {
        trackProductEvent("job_alert_subscribe", { country, specialty });
        setDone(true);
      } else {
        setError(true);
      }
    });
  }

  if (done) {
    return (
      <div className="glass card-glow rounded-2xl p-5 text-center">
        <p className="font-bold text-brand-cyan">
          🎉 تمام! رح نبعتلك أول ما تنزل وظيفة حقيقية تناسبك.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="glass card-glow rounded-2xl p-5">
      <p className="font-bold">🔔 خلي أوّل من يعرف</p>
      <p className="mt-1 text-sm text-muted">
        لسا ما في إعلانات وظائف موثّقة هون. سجّل إيميلك وبنبعتلك أول ما ننشر
        وظيفة حقيقية تناسب تخصصك.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          dir="ltr"
          maxLength={254}
          placeholder="you@example.com"
          className="flex-1 rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand-purple"
        />
        <select
          value={specialty}
          onChange={(e) => setSpecialty(e.target.value)}
          className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-brand-purple"
        >
          {SPECIALTIES.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.labelAr}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={pending}
          className="btn-neon shrink-0 px-6 py-2.5 text-sm disabled:opacity-60"
        >
          {pending ? "..." : "سجّلني"}
        </button>
      </div>

      {/* Honeypot — visually hidden, ignored by humans. */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="hidden"
        aria-hidden="true"
      />

      {error && (
        <p className="mt-2 text-sm text-red-500">
          تعذّر التسجيل. تأكّد من صحة الإيميل وحاول مجددًا.
        </p>
      )}
    </form>
  );
}

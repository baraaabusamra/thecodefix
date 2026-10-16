"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { submitSuggestion } from "../actions/suggest";

// Floating "اقترح لغة/خاصية" button + modal, shown on every public page.
// Submissions go to the DB (reviewed in the admin panel). No login required.
export default function SuggestBox() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(false);
  const [type, setType] = useState("language");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [pending, startTransition] = useTransition();

  // Close on Escape while the modal is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Don't show inside the admin panel.
  if (pathname?.startsWith("/admin")) return null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(false);
    if (message.trim().length < 3) {
      setError(true);
      return;
    }
    startTransition(async () => {
      const res = await submitSuggestion({ type, message, email, website });
      if (res.ok) {
        setDone(true);
        setMessage("");
        setEmail("");
      } else {
        setError(true);
      }
    });
  }

  function close() {
    setOpen(false);
    // Reset the "thanks" state a moment later so it's fresh next time.
    setTimeout(() => setDone(false), 300);
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="اقترح لغة أو خاصية"
        className="no-print fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-3 text-sm font-bold shadow-lg transition hover:neon-glow"
      >
        <span aria-hidden>💡</span>
        <span className="hidden sm:inline">اقترح لغة/خاصية</span>
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="suggest-title"
          onClick={close}
        >
          <div
            className="glass w-full max-w-md rounded-2xl border border-border p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {done ? (
              <div className="py-6 text-center">
                <p className="text-2xl">🎉</p>
                <p className="mt-2 font-bold text-brand-cyan">
                  شكرًا لاقتراحك! وصلنا وسنراجعه.
                </p>
                <button
                  type="button"
                  onClick={close}
                  className="btn-neon mt-5 px-6 py-2"
                >
                  تمام
                </button>
              </div>
            ) : (
              <form onSubmit={submit}>
                <div className="mb-4 flex items-start justify-between gap-3">
                  <h2 id="suggest-title" className="text-lg font-bold">
                    💡 شو تحب نضيف؟
                  </h2>
                  <button
                    type="button"
                    onClick={close}
                    aria-label="إغلاق"
                    className="text-muted transition hover:text-foreground"
                  >
                    ✕
                  </button>
                </div>
                <p className="mb-4 text-sm text-muted">
                  اقترح لغة برمجة جديدة أو خاصية تحب تشوفها على The Code Fix.
                </p>

                <label className="mb-1 block text-sm font-semibold">النوع</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-purple"
                >
                  <option value="language">لغة برمجة جديدة</option>
                  <option value="feature">خاصية / تحسين</option>
                  <option value="other">أخرى</option>
                </select>

                <label className="mb-1 block text-sm font-semibold">
                  اقتراحك
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  minLength={3}
                  maxLength={1000}
                  rows={4}
                  placeholder="مثال: أتمنى تضيفوا مسار Kubernetes، أو خاصية الوضع الليلي للمحرّر."
                  className="mb-3 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-brand-purple"
                />

                <label className="mb-1 block text-sm font-semibold">
                  بريدك (اختياري)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  dir="ltr"
                  maxLength={254}
                  placeholder="you@example.com"
                  className="mb-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-end text-sm outline-none focus:border-brand-purple"
                />

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
                  <p className="mb-2 text-sm text-red-500">
                    تعذّر الإرسال. اكتب اقتراحًا واضحًا وحاول مجددًا.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={pending}
                  className="btn-neon w-full py-3 disabled:opacity-60"
                >
                  {pending ? "جارٍ الإرسال..." : "إرسال الاقتراح"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}

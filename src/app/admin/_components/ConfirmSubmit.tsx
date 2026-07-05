"use client";

import { useState } from "react";

// Destructive-action guard: renders a trigger button that opens a confirmation
// modal; the confirm button submits the enclosing <form>. Place INSIDE the
// form whose action should run on confirm.
export default function ConfirmSubmit({
  label,
  title = "تأكيد الإجراء",
  message,
  confirmLabel = "نعم، احذف",
  className,
}: {
  label: React.ReactNode;
  title?: string;
  message: string;
  confirmLabel?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-2 text-sm text-muted">{message}</p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="submit"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                {confirmLabel}
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm font-semibold transition hover:bg-surface"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

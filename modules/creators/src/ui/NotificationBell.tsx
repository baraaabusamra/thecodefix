"use client";

import { useState } from "react";
import type { Notification } from "@tcf/db/schema";

function markAsRead(formData: FormData) {
  const id = formData.get("id") as string;
  if (!id) return;
  fetch("/api/notifications/read", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  }).catch(() => {});
}

type NotificationBellProps = {
  notifications: Notification[];
};

export default function NotificationBell({ notifications }: NotificationBellProps) {
  const unread = notifications.filter((n) => !n.read).length;
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative rounded-full p-2 transition hover:bg-surface"
        aria-label={`الإشعارات (${unread} غير مقروء)`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 z-50 mt-2 w-80 -translate-x-1/2 rounded-xl border border-border bg-background p-3 shadow-xl">
            <h3 className="mb-2 px-1 text-sm font-semibold">الإشعارات</h3>
            {notifications.length === 0 ? (
              <p className="px-1 text-xs text-muted">لا توجد إشعارات</p>
            ) : (
              <div className="flex max-h-64 flex-col gap-1 overflow-y-auto">
                {notifications.map((n) => (
                  <form key={n.id} action={markAsRead} className="contents">
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      className={`w-full rounded-lg px-3 py-2 text-right text-sm transition hover:bg-surface ${
                        !n.read ? "border-r-2 border-accent bg-accent/5 font-medium" : ""
                      }`}
                      onClick={() => { if (n.link) window.location.href = n.link; }}
                    >
                      <p className="text-xs">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-[11px] text-muted line-clamp-2">{n.body}</p>}
                    </button>
                  </form>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

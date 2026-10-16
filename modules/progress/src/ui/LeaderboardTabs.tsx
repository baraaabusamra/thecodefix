"use client";

import { useState } from "react";
import type { LeaderboardRow } from "../leaderboard";

const MEDALS = ["🥇", "🥈", "🥉"];

// Weekly league / all-time toggle for the leaderboard page. Pure client
// presentation — both lists arrive pre-sorted from the server.
export default function LeaderboardTabs({
  weekly,
  allTime,
  weekStart,
}: {
  weekly: LeaderboardRow[];
  allTime: LeaderboardRow[];
  weekStart: string;
}) {
  const [tab, setTab] = useState<"weekly" | "all">("weekly");
  const rows = tab === "weekly" ? weekly : allTime;

  return (
    <div className="mt-8">
      <div
        role="tablist"
        aria-label="نطاق الترتيب"
        className="mb-5 inline-flex gap-1 rounded-2xl border border-border bg-surface p-1.5"
      >
        <TabButton active={tab === "weekly"} onClick={() => setTab("weekly")}>
          ⚡ دوري الأسبوع
        </TabButton>
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>
          👑 كل الوقت
        </TabButton>
      </div>
      {tab === "weekly" && (
        <p className="mb-4 text-xs text-muted">
          أسبوع الدوري الحالي بدأ الاثنين {weekStart} — النقاط أدناه ما جُمع
          خلاله فقط.
        </p>
      )}

      <ol key={tab} className="tab-panel space-y-2">
        {rows.map((r, i) => {
          const points = tab === "weekly" ? r.weeklyPoints : r.game.points;
          const top3 = i < 3;
          return (
            <li
              key={r.userId}
              className={`flex items-center gap-3 rounded-2xl border bg-surface px-4 py-3 transition-all duration-300 ${
                top3
                  ? "border-brand-purple/40 shadow-[0_0_18px_-10px_var(--brand-purple)]"
                  : "border-border"
              }`}
            >
              <span className="w-8 shrink-0 text-center text-lg font-bold text-muted">
                {MEDALS[i] ?? i + 1}
              </span>
              {r.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.image}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
                />
              ) : (
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-purple/10 text-sm font-bold text-accent">
                  {r.name.trim().charAt(0).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.name}</p>
                <p className="text-xs text-muted">
                  {r.game.level.icon} {r.game.level.title} · {r.game.lessonsDone} درسًا
                  · {r.game.quizzesPassed} اختبارًا
                </p>
              </div>
              <span
                className={`shrink-0 text-lg font-bold ${top3 ? "text-accent" : "text-foreground"}`}
              >
                {points}
                <span className="ms-1 text-xs font-normal text-muted">نقطة</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-300 ${
        active
          ? "bg-brand-purple/15 text-accent shadow-[0_0_14px_-4px_var(--brand-purple)]"
          : "text-muted hover:bg-surface-2 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

"use client";

import { useProgress } from "../progress";
import {
  computeAchievements,
  computeAchievementsFromTotals,
  type AchievementTotals,
} from "../achievements";

// Gamification: shows earned/locked badges. `totals` (server-trusted, for
// signed-in users) wins over the local, untrusted guest progress.
export default function AchievementsGrid({ totals }: { totals?: AchievementTotals | null }) {
  const progress = useProgress();
  const badges = totals ? computeAchievementsFromTotals(totals) : computeAchievements(progress);
  const earned = badges.filter((b) => b.earned).length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xl font-bold">🎖️ الإنجازات</h2>
        <span className="text-sm text-muted">
          {earned} / {badges.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {badges.map((b) => (
          <div
            key={b.id}
            title={b.desc}
            className={`rounded-2xl border p-4 text-center transition ${
              b.earned
                ? "border-brand-cyan bg-surface neon-glow"
                : "border-border bg-surface/40 opacity-60 grayscale"
            }`}
          >
            <div className="text-3xl">{b.earned ? b.icon : "🔒"}</div>
            <p className="mt-2 text-sm font-bold">{b.title}</p>
            <p className="mt-0.5 text-[11px] text-muted">{b.desc}</p>
            {!b.earned && b.current > 0 && (
              <p className="mt-1 text-[11px] font-semibold text-brand-purple">
                {b.current} / {b.goal}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

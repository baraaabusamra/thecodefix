import { db } from "@/db";
import { users, userProgress, leagueSnapshots } from "@/db/schema";
import { eq } from "drizzle-orm";
import { computeGamification, type Gamification } from "./points";
import type { Progress } from "./progress-types";

// Weekly league + all-time leaderboard, computed from the synced progress of
// signed-in users (user_progress). Weekly points use a LAZY snapshot: the
// first read of a new week stores each user's current total as the baseline,
// so weekly = total − baseline and the board resets every Monday 00:00 UTC
// without any cron.

export type LeaderboardRow = {
  userId: string;
  name: string;
  image: string | null;
  game: Gamification;
  weeklyPoints: number;
};

export type LeaderboardData = {
  weekStart: string; // "YYYY-MM-DD" Monday UTC
  weekly: LeaderboardRow[]; // sorted by weeklyPoints desc
  allTime: LeaderboardRow[]; // sorted by total points desc
};

/** Monday 00:00 UTC of the current week, as YYYY-MM-DD. */
export function currentWeekStart(now = new Date()): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  const sinceMonday = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - sinceMonday);
  return d.toISOString().slice(0, 10);
}

export async function getLeaderboard(limit = 50): Promise<LeaderboardData | null> {
  if (!db) return null;
  const weekStart = currentWeekStart();

  // All synced learners + their identity.
  const rows = await db
    .select({
      userId: userProgress.userId,
      certName: userProgress.name,
      data: userProgress.data,
      userName: users.name,
      image: users.image,
    })
    .from(userProgress)
    .leftJoin(users, eq(userProgress.userId, users.id));

  const scored = rows
    .map((r) => {
      let parsed: Partial<Progress> = {};
      try {
        parsed = JSON.parse(r.data || "{}");
      } catch {
        parsed = {};
      }
      const game = computeGamification({
        name: r.certName,
        completedLessons: parsed.completedLessons ?? {},
        quizzes: parsed.quizzes ?? {},
      });
      return {
        userId: r.userId,
        // Verified OAuth name wins — the free-text progress name (r.certName)
        // is user-editable and was previously prioritized, letting anyone
        // display an arbitrary/impersonating name on the public leaderboard.
        name: r.userName || r.certName || "متعلّم",
        image: r.image ?? null,
        game,
      };
    })
    .filter((r) => r.game.points > 0);

  if (scored.length === 0) return { weekStart, weekly: [], allTime: [] };

  // Load this week's baselines; create missing ones at the current totals.
  const weekSnaps = new Map<string, number>();
  const thisWeek = await db
    .select({ userId: leagueSnapshots.userId, points: leagueSnapshots.points })
    .from(leagueSnapshots)
    .where(eq(leagueSnapshots.weekStart, weekStart));
  for (const s of thisWeek) weekSnaps.set(s.userId, s.points);

  const missing = scored.filter((r) => !weekSnaps.has(r.userId));
  if (missing.length > 0) {
    await db
      .insert(leagueSnapshots)
      .values(
        missing.map((r) => ({
          userId: r.userId,
          weekStart,
          points: r.game.points,
        }))
      )
      .onConflictDoNothing();
    for (const r of missing) weekSnaps.set(r.userId, r.game.points);
  }

  const withWeekly: LeaderboardRow[] = scored.map((r) => ({
    ...r,
    weeklyPoints: Math.max(0, r.game.points - (weekSnaps.get(r.userId) ?? r.game.points)),
  }));

  return {
    weekStart,
    weekly: [...withWeekly]
      .sort((a, b) => b.weeklyPoints - a.weeklyPoints || b.game.points - a.game.points)
      .slice(0, limit),
    allTime: [...withWeekly]
      .sort((a, b) => b.game.points - a.game.points)
      .slice(0, limit),
  };
}

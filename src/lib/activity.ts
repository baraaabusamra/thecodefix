import { eq, and, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { dailyActivity } from "@/db/schema";

export async function logActivity(points: number): Promise<void> {
  if (!db) return;
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return;

  const today = new Date().toISOString().slice(0, 10);

  await db
    .insert(dailyActivity)
    .values({ userId, date: today, points })
    .onConflictDoUpdate({
      target: [dailyActivity.userId, dailyActivity.date],
      set: { points: sql`${dailyActivity.points} + ${points}` },
    });
}

export async function getActiveDates(userId: string): Promise<string[]> {
  if (!db) return [];
  const rows = await db
    .select({ date: dailyActivity.date })
    .from(dailyActivity)
    .where(eq(dailyActivity.userId, userId));
  return rows.map((r) => r.date);
}

import { db } from "@/db";
import { subscriptions } from "@/db/schema";
import { eq, and, gte } from "drizzle-orm";

export function isAiEnabled(): boolean {
  return !!(
    process.env.AI_API_KEY &&
    (process.env.AI_PROVIDER === "openai" || process.env.AI_PROVIDER === "anthropic")
  );
}

export type AiRole = "user" | "assistant";
export type AiMessage = { role: AiRole; content: string };

const FREE_DAILY_LIMIT = 10;

export async function getAiDailyLimit(userId: string): Promise<{ allowed: number; used: number; remaining: number }> {
  if (!isAiEnabled() || !db) return { allowed: 0, used: 0, remaining: 0 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sub = await db
    .select({ plan: subscriptions.plan, currentPeriodEnd: subscriptions.currentPeriodEnd })
    .from(subscriptions)
    .where(and(eq(subscriptions.userId, userId), gte(subscriptions.currentPeriodEnd, today)))
    .limit(1);

  const isPro = sub.length > 0 && sub[0].plan === "pro";
  const allowed = isPro ? Infinity : FREE_DAILY_LIMIT;

  return { allowed, used: 0, remaining: isPro ? Infinity : FREE_DAILY_LIMIT };
}

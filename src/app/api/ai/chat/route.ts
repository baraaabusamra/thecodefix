import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isAiEnabled, getAiDailyLimit } from "@/lib/ai";
import { checkRateLimit, rateLimitKey, getClientIp, Limits } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  if (!isAiEnabled()) {
    return NextResponse.json({ error: "المساعد الذكي غير مفعّل بعد." }, { status: 503 });
  }

  const ip = await getClientIp();
  const rl = checkRateLimit(rateLimitKey("ai-chat", ip), Limits.general);
  if (!rl.allowed) return NextResponse.json({ error: "طلبات كثيرة جدًا. حاول لاحقًا." }, { status: 429 });

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "يجب تسجيل الدخول أولاً." }, { status: 401 });
  }

  const limit = await getAiDailyLimit(userId);
  if (limit.remaining <= 0) {
    return NextResponse.json({ error: "لقد استنفدت حدّك اليومي. جرّب غدًا أو اشترك فيPro." }, { status: 429 });
  }

  const { message } = await req.json();
  if (!message || typeof message !== "string" || message.length > 2000) {
    return NextResponse.json({ error: "رسالة غير صالحة" }, { status: 400 });
  }

  return NextResponse.json({
    reply: "مرحبًا! شكرًا لسؤالك. هذه الميزة قيد التشغيل حاليًا — سيتم تفعيل المساعد الذكي قريبًا.",
  });
}

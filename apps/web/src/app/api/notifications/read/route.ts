import { NextResponse } from "next/server";
import { auth } from "@tcf/identity/auth";
import { markNotificationRead } from "@tcf/creators/creators";
import { rateLimit } from "@tcf/core/rate-limit";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`notif-read:${session.user.id}`, 60, 60 * 1000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { id } = await request.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await markNotificationRead(id, session.user.id);
  return NextResponse.json({ ok: true });
}

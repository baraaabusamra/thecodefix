import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createCreator, isDisplayNameTaken } from "@/lib/creators";
import { notifyCreatorRegistered } from "@/lib/creators-notifications";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const displayName = String(body.displayName ?? "").trim();
  if (!displayName) {
    return NextResponse.json({ error: "displayName is required" }, { status: 400 });
  }

  if (await isDisplayNameTaken(displayName)) {
    return NextResponse.json({ error: "displayName is already taken" }, { status: 409 });
  }

  let created;
  try {
    created = await createCreator({
      userId: session.user.id,
      displayName,
      bio: body.bio ?? null,
      website: body.website ?? null,
    });
  } catch {
    return NextResponse.json({ error: "displayName is already taken" }, { status: 409 });
  }

  if (!created) {
    return NextResponse.json({ error: "Failed to create creator" }, { status: 500 });
  }

  await notifyCreatorRegistered(session.user.id, displayName);

  return NextResponse.json(created, { status: 201 });
}

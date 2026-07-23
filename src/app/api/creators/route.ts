import { NextResponse } from "next/server";
import { z } from "zod/v4";
import { auth } from "@/auth";
import { createCreator, isDisplayNameTaken } from "@/lib/creators";
import { notifyCreatorRegistered } from "@/lib/creators-notifications";
import { optionalSafeUrlSchema } from "@/lib/validation";

// Mirrors the validation in src/app/creators/register/actions.ts — this
// route is a second entry point to the same privileged write and must not
// be weaker than the form-based server action.
const registerSchema = z.object({
  displayName: z.string().min(1, "اسم العرض مطلوب").max(100, "الاسم طويل جدًا"),
  bio: z.string().max(500, "النص طويل جدًا").optional().default(""),
  website: optionalSafeUrlSchema,
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }
  const { displayName, bio, website } = parsed.data;

  if (await isDisplayNameTaken(displayName)) {
    return NextResponse.json({ error: "displayName is already taken" }, { status: 409 });
  }

  let created;
  try {
    created = await createCreator({
      userId: session.user.id,
      displayName,
      bio: bio || null,
      website: website || null,
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

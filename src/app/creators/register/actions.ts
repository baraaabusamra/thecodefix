"use server";

import { z } from "zod/v4";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireDb } from "@/db";
import { createCreator, isDisplayNameTaken } from "@/lib/creators";
import { notifyCreatorRegistered } from "@/lib/creators-notifications";

const registerSchema = z.object({
  displayName: z.string().min(1, "اسم العرض مطلوب").max(100, "الاسم طويل جدًا"),
  bio: z.string().max(500, "النص طويل جدًا").optional().default(""),
  website: z
    .string()
    .url("رابط غير صالح")
    .optional()
    .or(z.literal(""))
    .default(""),
});

export type RegisterState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  fields?: Record<string, string>;
};

export async function registerCreator(
  prevState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { success: false, message: "يجب تسجيل الدخول أولاً" };
  }

  const raw = Object.fromEntries(formData);
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      message: "يرجى تصحيح الأخطاء أدناه",
      errors: fieldErrors as Record<string, string[]>,
      fields: raw as Record<string, string>,
    };
  }

  requireDb();

  const { displayName, bio, website } = parsed.data;

  if (await isDisplayNameTaken(displayName)) {
    return {
      success: false,
      message: "اسم العرض هذا مستخدم بالفعل، جرّب اسمًا آخر",
      errors: { displayName: ["هذا الاسم محجوز — اختر اسمًا مختلفًا"] },
      fields: raw as Record<string, string>,
    };
  }

  let created;
  try {
    created = await createCreator({
      userId,
      displayName,
      bio: bio || null,
      website: website || null,
    });
  } catch {
    // Unique constraint race: someone else took the name between the check
    // above and this insert.
    return {
      success: false,
      message: "اسم العرض هذا مستخدم بالفعل، جرّب اسمًا آخر",
      errors: { displayName: ["هذا الاسم محجوز — اختر اسمًا مختلفًا"] },
      fields: raw as Record<string, string>,
    };
  }

  if (!created) {
    return { success: false, message: "حدث خطأ أثناء إنشاء الحساب" };
  }

  await notifyCreatorRegistered(userId, displayName);

  redirect("/creators/dashboard");
}

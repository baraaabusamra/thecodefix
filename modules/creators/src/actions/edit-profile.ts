"use server";

import { z } from "zod/v4";
import { redirect } from "next/navigation";
import { auth } from "@tcf/identity/auth";
import { getCreator, updateCreator } from "../creators";
import { optionalSafeUrlSchema } from "@tcf/core/validation";
import { rateLimit } from "@tcf/core/rate-limit";

const editProfileSchema = z.object({
  bio: z.string().max(500, "النص طويل جدًا").optional().or(z.literal("")).default(""),
  website: optionalSafeUrlSchema,
  avatar: optionalSafeUrlSchema,
});

export type EditProfileState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  fields?: Record<string, string>;
};

export async function updateOwnCreatorProfile(
  creatorId: string,
  prevState: EditProfileState,
  formData: FormData
): Promise<EditProfileState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "يجب تسجيل الدخول أولاً" };
  }

  if (!rateLimit(`edit-profile:${session.user.id}`, 10, 10 * 60 * 1000)) {
    return { success: false, message: "محاولات كثيرة. حاول بعد قليل." };
  }

  const creator = await getCreator(creatorId);
  if (!creator || creator.userId !== session.user.id) {
    return { success: false, message: "لا تملك هذه الصفحة" };
  }

  const raw = Object.fromEntries(formData);
  const parsed = editProfileSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      message: "يرجى تصحيح الأخطاء أدناه",
      errors: fieldErrors as Record<string, string[]>,
      fields: raw as Record<string, string>,
    };
  }

  const { bio, website, avatar } = parsed.data;

  await updateCreator(creatorId, {
    bio: bio || null,
    website: website || null,
    avatar: avatar || null,
  });

  redirect(`/creators/dashboard?page=${creatorId}`);
}

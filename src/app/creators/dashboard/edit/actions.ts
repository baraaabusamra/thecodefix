"use server";

import { z } from "zod/v4";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getCreator, updateCreator } from "@/lib/creators";

const editProfileSchema = z.object({
  bio: z.string().max(500, "النص طويل جدًا").optional().or(z.literal("")).default(""),
  website: z.string().url("رابط غير صالح").optional().or(z.literal("")).default(""),
  avatar: z.string().url("رابط الصورة غير صالح").optional().or(z.literal("")).default(""),
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

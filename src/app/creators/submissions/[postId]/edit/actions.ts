"use server";

import { z } from "zod/v4";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPost, getCreator, updatePostContent } from "@/lib/creators";
import { rateLimit } from "@/lib/rate-limit";

const hashtagPattern = /^[\w؀-ۿ]+$/;
function validateHashtags(value: string): boolean {
  if (!value) return true;
  const tags = value.split(",").map((t) => t.trim()).filter(Boolean);
  if (tags.length > 10) return false;
  return tags.every((t) => hashtagPattern.test(t));
}

const editSchema = z.object({
  title: z.string().min(3, "العنوان يجب أن يكون 3 أحرف على الأقل").max(200, "العنوان طويل جدًا"),
  body: z.string().min(3, "النص مطلوب").max(3000, "النص طويل جدًا"),
  imageUrl: z.string().url("رابط الصورة غير صالح").optional().or(z.literal("")).default(""),
  link: z.string().url("الرابط غير صالح").optional().or(z.literal("")).default(""),
  hashtags: z
    .string()
    .max(500)
    .optional()
    .default("")
    .refine(validateHashtags, "الوسوم: 10 كحد أقصى، أحرف وأرقام فقط"),
});

export type EditState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  fields?: Record<string, string>;
};

export async function updateOwnPost(
  postId: string,
  prevState: EditState,
  formData: FormData
): Promise<EditState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "يجب تسجيل الدخول أولاً" };
  }

  // Each successful edit returns the post to moderation, so cap queue churn
  // before performing ownership lookups or validation work.
  if (!rateLimit(`edit-post:${session.user.id}`, 10, 10 * 60 * 1000)) {
    return { success: false, message: "محاولات كثيرة. حاول بعد قليل." };
  }

  const post = await getPost(postId);
  if (!post) return { success: false, message: "المنشور غير موجود" };

  const creator = await getCreator(post.creatorId);
  if (!creator || creator.userId !== session.user.id) {
    return { success: false, message: "لا تملك هذا المنشور" };
  }

  const raw = Object.fromEntries(formData);
  const parsed = editSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      message: "يرجى تصحيح الأخطاء أدناه",
      errors: fieldErrors as Record<string, string[]>,
      fields: raw as Record<string, string>,
    };
  }

  const { title, body, imageUrl, link, hashtags } = parsed.data;

  await updatePostContent(postId, {
    title,
    body,
    imageUrl: imageUrl || null,
    link: link || null,
    hashtags: hashtags || null,
  });

  redirect(`/creators/submissions?page=${creator.id}`);
}

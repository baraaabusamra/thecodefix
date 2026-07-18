"use server";

import { z } from "zod/v4";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireDb } from "@/db";
import { posts } from "@/db/schema";
import { getCreator } from "@/lib/creators";
import { notifySubmissionReceived } from "@/lib/creators-notifications";

const hashtagPattern = /^[\w؀-ۿ]+$/;
function validateHashtags(value: string): boolean {
  if (!value) return true;
  const tags = value.split(",").map((t) => t.trim()).filter(Boolean);
  if (tags.length > 10) return false;
  return tags.every((t) => hashtagPattern.test(t));
}

const submitSchema = z.object({
  creatorId: z.string().min(1, "الصفحة مطلوبة"),
  title: z
    .string()
    .min(3, "العنوان يجب أن يكون 3 أحرف على الأقل")
    .max(200, "العنوان طويل جدًا (200 حرف كحد أقصى)"),
  body: z
    .string()
    .min(3, "النص مطلوب")
    .max(3000, "النص طويل جدًا (3000 حرف كحد أقصى)"),
  imageUrl: z.string().url("رابط الصورة غير صالح").optional().or(z.literal("")).default(""),
  link: z.string().url("الرابط غير صالح").optional().or(z.literal("")).default(""),
  hashtags: z
    .string()
    .max(500)
    .optional()
    .default("")
    .refine(validateHashtags, "الوسوم: 10 كحد أقصى، أحرف وأرقام فقط"),
});

export type SubmitState = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  fields?: Record<string, string>;
};

export async function submitVideo(
  prevState: SubmitState,
  formData: FormData
): Promise<SubmitState> {
  const session = await auth();
  if (!session?.user?.id) {
    return { success: false, message: "يجب تسجيل الدخول أولاً" };
  }

  const dbConn = requireDb();

  const raw = Object.fromEntries(formData);
  const parsed = submitSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    return {
      success: false,
      message: "يرجى تصحيح الأخطاء أدناه",
      errors: fieldErrors as Record<string, string[]>,
      fields: raw as Record<string, string>,
    };
  }

  const { creatorId, title, body, imageUrl, link, hashtags } = parsed.data;

  // Ownership check: the page being posted to must actually belong to the
  // signed-in user — never trust the creatorId from the form alone.
  const creator = await getCreator(creatorId);
  if (!creator || creator.userId !== session.user.id) {
    return { success: false, message: "الصفحة غير موجودة أو لا تملكها" };
  }

  const rows = await dbConn
    .insert(posts)
    .values({
      creatorId,
      title,
      body,
      imageUrl: imageUrl || null,
      link: link || null,
      hashtags: hashtags || null,
      status: "pending",
    })
    .returning();

  const submission = rows[0];
  if (!submission) {
    return { success: false, message: "حدث خطأ أثناء إرسال المنشور" };
  }

  await notifySubmissionReceived(session.user.id, title, submission.id);

  redirect(`/creators/submissions?page=${creatorId}`);
}

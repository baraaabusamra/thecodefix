"use server";

import { z } from "zod/v4";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { requireDb } from "@/db";
import { videoSubmissions } from "@/db/schema";
import { getCreatorByUserId } from "@/lib/creators";
import { notifySubmissionReceived } from "@/lib/creators-notifications";

const PLATFORM_PATTERNS: Record<string, RegExp> = {
  youtube: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/i,
  instagram: /^(https?:\/\/)?(www\.)?instagram\.com\/(p|reel)\/.+/i,
  tiktok: /^(https?:\/\/)?(www\.)?tiktok\.com\/@.+\/video\/\d+/i,
  facebook: /^(https?:\/\/)?(www\.)?(facebook\.com|fb\.watch)\/.+/i,
};

function detectPlatform(url: string): string | null {
  const entry = Object.entries(PLATFORM_PATTERNS).find(([, re]) => re.test(url));
  return entry ? entry[0] : null;
}

const PLATFORMS = ["youtube", "instagram", "tiktok", "facebook"] as const;

const hashtagPattern = /^[\w\u0600-\u06FF]+$/;
function validateHashtags(value: string): boolean {
  if (!value) return true;
  const tags = value.split(",").map((t) => t.trim()).filter(Boolean);
  if (tags.length > 10) return false;
  return tags.every((t) => hashtagPattern.test(t));
}

const submitSchema = z.object({
  title: z
    .string()
    .min(3, "العنوان يجب أن يكون 3 أحرف على الأقل")
    .max(200, "العنوان طويل جدًا (200 حرف كحد أقصى)"),
  description: z.string().max(2000, "الوصف طويل جدًا").optional().default(""),
  videoUrl: z.string().url("رابط الفيديو غير صالح"),
  platform: z.enum(PLATFORMS, { message: "المنصة غير مدعومة" }),
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

  const creator = await getCreatorByUserId(session.user.id);
  if (!creator) {
    return { success: false, message: "يجب التسجيل كمنشئ محتوى أولاً" };
  }

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

  const { title, description, videoUrl, platform, hashtags } = parsed.data;

  const detected = detectPlatform(videoUrl);
  if (!detected) {
    return {
      success: false,
      message: "رابط الفيديو لا ينتمي إلى منصة مدعومة",
      errors: { videoUrl: ["الرابط يجب أن يكون من YouTube أو Instagram أو TikTok أو Facebook"] },
      fields: raw as Record<string, string>,
    };
  }

  if (detected !== platform) {
    return {
      success: false,
      message: "المنصة المحددة لا تتطابق مع رابط الفيديو",
      errors: {
        platform: [`الرابط من ${detected} لكنك اخترت ${platform}`],
        videoUrl: [`هذا الرابط من ${detected}`],
      },
      fields: raw as Record<string, string>,
    };
  }

  const rows = await dbConn
    .insert(videoSubmissions)
    .values({
      creatorId: creator.id,
      title,
      description: description || null,
      platform,
      videoUrl,
      hashtags: hashtags || null,
      status: "pending",
    })
    .returning();

  const submission = rows[0];
  if (!submission) {
    return { success: false, message: "حدث خطأ أثناء إرسال الفيديو" };
  }

  await notifySubmissionReceived(session.user.id, title, submission.id);

  redirect("/creators/submissions");
}

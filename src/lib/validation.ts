import { z } from "zod/v4";

// Shared zod primitive for any user-supplied URL that gets rendered as a
// raw `href`/`src` on a public page (creator website/avatar, post image/
// link, etc). `z.string().url()` alone accepts `javascript:`/`data:` URIs,
// which is a stored-XSS vector once rendered as an anchor href — restrict
// to http(s) explicitly.
export const safeUrlSchema = z
  .string()
  .url("رابط غير صالح")
  .refine((u) => /^https?:\/\//i.test(u), "الرابط يجب أن يبدأ بـ http:// أو https://");

export const optionalSafeUrlSchema = safeUrlSchema
  .optional()
  .or(z.literal(""))
  .default("");

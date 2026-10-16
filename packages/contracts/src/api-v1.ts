// packages/contracts/src/api-v1.ts
// 📍 خريطة: عقود الـ API ← شكل البيانات بين الموقع وتطبيق الموبايل
//
// The public, versioned HTTP contract served under /api/v1/* by apps/web and
// consumed by the mobile app (and any future client). One zod schema per
// payload: the server validates what it sends, the client validates what it
// receives, and a breaking change means a new version (/api/v2), never an
// edit here. See docs/v2/adr/0006-api-for-mobile.md.

import { z } from "zod";

export const API_VERSION = "v1" as const;

export const LocaleSchema = z.enum(["ar", "en"]);

/** Every successful response: `{ data, meta }`. */
export function envelope<T extends z.ZodTypeAny>(data: T) {
  return z.object({
    data,
    meta: z.object({
      apiVersion: z.literal(API_VERSION),
      locale: LocaleSchema,
      generatedAt: z.string(),
    }),
  });
}

/** Every error response: `{ error: { code, message } }` with an HTTP 4xx/5xx status. */
export const ApiErrorSchema = z.object({
  error: z.object({
    code: z.enum(["not_found", "bad_request", "rate_limited", "internal"]),
    message: z.string(),
  }),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const TrackSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string(),
  color: z.string(),
  order: z.number(),
  lessonCount: z.number().int().nonnegative(),
  url: z.string(),
});
export type TrackSummary = z.infer<typeof TrackSummarySchema>;

export const LessonSummarySchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  order: z.number(),
  url: z.string(),
});
export type LessonSummary = z.infer<typeof LessonSummarySchema>;

export const TrackDetailSchema = TrackSummarySchema.extend({
  lessons: z.array(LessonSummarySchema),
});
export type TrackDetail = z.infer<typeof TrackDetailSchema>;

export const LessonDetailSchema = LessonSummarySchema.extend({
  track: z.string(),
  /** MDX source. Clients render it (web: next-mdx-remote; mobile: a markdown renderer). */
  body: z.string(),
  updated: z.string().nullable(),
  previous: LessonSummarySchema.pick({ slug: true, title: true }).nullable(),
  next: LessonSummarySchema.pick({ slug: true, title: true }).nullable(),
});
export type LessonDetail = z.infer<typeof LessonDetailSchema>;

export const TracksResponseSchema = envelope(z.array(TrackSummarySchema));
export const TrackResponseSchema = envelope(TrackDetailSchema);
export const LessonResponseSchema = envelope(LessonDetailSchema);

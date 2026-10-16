// GET /api/v1/tracks/:track/lessons/:lesson — one lesson (MDX source + navigation).
// Contract: LessonResponseSchema in @tcf/contracts/api-v1.
import { fail, lessonDetail, ok, overLimit, SLUG } from "@/server/api-v1";

export async function GET(_request: Request, { params }: { params: Promise<{ track: string; lesson: string }> }) {
  if (await overLimit()) return fail(429, "rate_limited", "Too many requests");
  const { track, lesson } = await params;
  if (!SLUG.test(track) || !SLUG.test(lesson)) return fail(400, "bad_request", "Invalid slug");
  const detail = await lessonDetail(track, lesson);
  return detail ? ok(detail) : fail(404, "not_found", "Lesson not found");
}

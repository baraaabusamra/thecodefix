// GET /api/v1/tracks/:track — one track and its ordered lessons.
// Contract: TrackResponseSchema in @tcf/contracts/api-v1.
import { fail, ok, overLimit, SLUG, trackDetail } from "@/server/api-v1";

export async function GET(_request: Request, { params }: { params: Promise<{ track: string }> }) {
  if (await overLimit()) return fail(429, "rate_limited", "Too many requests");
  const { track } = await params;
  if (!SLUG.test(track)) return fail(400, "bad_request", "Invalid track slug");
  const detail = await trackDetail(track);
  return detail ? ok(detail) : fail(404, "not_found", "Track not found");
}

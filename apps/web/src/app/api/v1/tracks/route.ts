// GET /api/v1/tracks — every learning track with its lesson count.
// Contract: TracksResponseSchema in @tcf/contracts/api-v1.
import { fail, listTracks, ok, overLimit } from "@/server/api-v1";

export async function GET() {
  if (await overLimit()) return fail(429, "rate_limited", "Too many requests");
  return ok(await listTracks());
}

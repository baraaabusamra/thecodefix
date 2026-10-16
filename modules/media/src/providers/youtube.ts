// modules/media/src/providers/youtube.ts
// 📍 خريطة: وحدة الفيديو ← مزوّد YouTube (تضمين بدون كوكيز تتبّع)
//
// Free hosting for public lessons. Uses the privacy-enhanced
// youtube-nocookie.com embed so watching a lesson does not drop tracking
// cookies before the learner interacts.

import type { VideoProvider } from "../provider";

const ID = /^[A-Za-z0-9_-]{11}$/;

/** Extract an 11-character YouTube id from an id or a youtube.com / youtu.be URL. */
export function parseYouTubeId(input: string): string | null {
  const value = input.trim();
  if (ID.test(value)) return value;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = url.pathname.slice(1).split("/")[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const m = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/);
      id = m?.[1] ?? null;
    }
  }
  return id && ID.test(id) ? id : null;
}

export const youtubeProvider: VideoProvider = {
  name: "youtube",
  isValidAssetId: (id) => ID.test(id),
  playback: (asset) => ({
    kind: "embed",
    url: `https://www.youtube-nocookie.com/embed/${asset.providerAssetId}?rel=0&modestbranding=1`,
    title: asset.title,
  }),
};

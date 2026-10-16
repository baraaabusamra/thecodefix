// modules/media — provider-neutral video playback.
//
// The security-relevant part: only ids a provider could really serve are
// accepted, so a stored "video" can never become an arbitrary iframe or file
// URL, and subscriber-only files are never exposed through a public URL.

import { test } from "node:test";
import assert from "node:assert/strict";

const { parseYouTubeId } = await import("../modules/media/src/providers/youtube.ts");
const { resolvePlayback, getProvider } = await import("../modules/media/src/provider.ts");

const asset = (over) => ({ id: "v1", provider: "youtube", providerAssetId: "dQw4w9WgXcQ", title: "مقدمة", locale: "ar", access: "free", ...over });

test("YouTube ids are extracted from every common URL shape", () => {
  for (const input of [
    "dQw4w9WgXcQ",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42",
    "https://youtu.be/dQw4w9WgXcQ?si=abc",
    "https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://m.youtube.com/shorts/dQw4w9WgXcQ",
    "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ",
  ]) {
    assert.equal(parseYouTubeId(input), "dQw4w9WgXcQ", input);
  }
});

test("non-YouTube hosts and malformed ids are rejected", () => {
  for (const input of [
    "https://evil.example/watch?v=dQw4w9WgXcQ",
    "https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ",
    "javascript:alert(1)",
    "https://www.youtube.com/watch?v=short",
    "",
  ]) {
    assert.equal(parseYouTubeId(input), null, input);
  }
});

test("YouTube playback uses the privacy-enhanced embed host", () => {
  const src = resolvePlayback(asset());
  assert.equal(src.kind, "embed");
  assert.match(src.url, /^https:\/\/www\.youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/);
});

test("an invalid provider id never resolves to a playable source", () => {
  assert.throws(() => resolvePlayback(asset({ providerAssetId: "../../x" })), /Invalid youtube asset id/);
  assert.throws(() => resolvePlayback(asset({ provider: "blob", providerAssetId: "https://evil.example/a.mp4" })), /Invalid blob asset id/);
});

test("Blob files resolve under the configured base URL, free videos only", () => {
  process.env.NEXT_PUBLIC_VIDEO_BLOB_BASE_URL = "https://media.example.com/";
  try {
    const src = resolvePlayback(asset({ provider: "blob", providerAssetId: "videos/python/01-intro.mp4" }));
    assert.deepEqual(src, { kind: "file", url: "https://media.example.com/videos/python/01-intro.mp4", mimeType: "video/mp4", posterUrl: undefined, captions: [] });
    assert.throws(
      () => resolvePlayback(asset({ provider: "blob", providerAssetId: "videos/python/02-paid.mp4", access: "subscribers" })),
      /signed playback URLs/
    );
  } finally {
    delete process.env.NEXT_PUBLIC_VIDEO_BLOB_BASE_URL;
  }
});

test("unknown providers fail loudly", () => {
  assert.throws(() => getProvider("vimeo"), /Unknown video provider/);
});

// modules/media/src/providers/blob.ts
// 📍 خريطة: وحدة الفيديو ← مزوّد Vercel Blob (ملفات MP4 مستضافة ذاتيًا)
//
// For course videos the platform owns. `providerAssetId` is the Blob
// pathname (e.g. "videos/python/01-intro.mp4"); the public base URL comes
// from NEXT_PUBLIC_VIDEO_BLOB_BASE_URL. Subscriber-only videos must be
// served through signed URLs (ADR 0007 phase 2) — this adapter refuses them
// until that exists rather than exposing a paid file publicly.

import type { VideoProvider } from "../provider";

const PATH = /^videos\/[a-z0-9][a-z0-9/_-]*\.(mp4|webm)$/;

export const blobProvider: VideoProvider = {
  name: "blob",
  isValidAssetId: (id) => PATH.test(id) && !id.includes(".."),
  playback: (asset) => {
    if (asset.access !== "free") {
      throw new Error("Subscriber-only Blob videos need signed playback URLs (ADR 0007, phase 2).");
    }
    const base = process.env.NEXT_PUBLIC_VIDEO_BLOB_BASE_URL;
    if (!base) throw new Error("NEXT_PUBLIC_VIDEO_BLOB_BASE_URL is not configured.");
    return {
      kind: "file",
      url: `${base.replace(/\/$/, "")}/${asset.providerAssetId}`,
      mimeType: asset.providerAssetId.endsWith(".webm") ? "video/webm" : "video/mp4",
      posterUrl: asset.posterUrl,
      captions: asset.captions ?? [],
    };
  },
};

// modules/media/src/provider.ts
// 📍 خريطة: وحدة الفيديو ← واجهة المزوّد وسجلّ المزوّدات
//
// Every hosting backend implements VideoProvider. Adding a provider (Mux,
// Cloudflare Stream, Bunny…) = one file in ./providers + one line below;
// nothing else in the platform changes.

import type { PlaybackSource, VideoAsset, VideoProvider, VideoProviderName } from "./types";
import { youtubeProvider } from "./providers/youtube";
import { blobProvider } from "./providers/blob";

export type { VideoProvider };

const PROVIDERS: Record<VideoProviderName, VideoProvider> = {
  youtube: youtubeProvider,
  blob: blobProvider,
};

export function getProvider(name: VideoProviderName): VideoProvider {
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Unknown video provider: ${name}`);
  return p;
}

/** Resolve playback for an asset, validating its provider id first. */
export function resolvePlayback(asset: VideoAsset): PlaybackSource {
  const provider = getProvider(asset.provider);
  if (!provider.isValidAssetId(asset.providerAssetId)) {
    throw new Error(`Invalid ${asset.provider} asset id for video ${asset.id}`);
  }
  return provider.playback(asset);
}

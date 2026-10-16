// modules/media/src/types.ts
// 📍 خريطة: وحدة الفيديو ← أنواع البيانات
//
// A video in the platform is a provider-neutral record. The provider (where
// the bytes live) is a detail behind VideoProvider, so a lesson or a course
// can move from YouTube to self-hosting or a streaming service without
// touching the pages that show it. See docs/v2/adr/0007-video.md.

import type { Locale } from "@tcf/content/i18n";

export type VideoProviderName = "youtube" | "blob";

export type Captions = { locale: Locale; label: string; url: string };

export type VideoAsset = {
  /** Stable platform id (also the future DB primary key). */
  id: string;
  provider: VideoProviderName;
  /** The provider's own id: a YouTube video id, a Blob pathname, … */
  providerAssetId: string;
  title: string;
  locale: Locale;
  durationSec?: number;
  posterUrl?: string;
  captions?: Captions[];
  /** Paid content is gated by billing entitlements before playback is resolved. */
  access: "free" | "subscribers";
};

/** What a player needs to render — never the provider's credentials. */
export type PlaybackSource =
  | { kind: "embed"; url: string; title: string }
  | { kind: "file"; url: string; mimeType: "video/mp4" | "video/webm"; posterUrl?: string; captions: Captions[] };

/** Learner progress on one video (persisted once ADR 0007 phase 2 adds its table). */
export type WatchEvent = {
  videoId: string;
  positionSec: number;
  durationSec: number;
  completed: boolean;
  at: string;
};

/** Every hosting backend implements this (see ./provider.ts for the registry). */
export interface VideoProvider {
  readonly name: VideoProviderName;
  /** Reject ids this provider could never serve (defends against injected URLs). */
  isValidAssetId(id: string): boolean;
  /** Resolve what the player renders. Must not leak secrets. */
  playback(asset: VideoAsset): PlaybackSource;
}

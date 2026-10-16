// modules/media/src/ui/VideoPlayer.tsx
// 📍 خريطة: وحدة الفيديو ← مشغّل الفيديو
//
// Renders a resolved PlaybackSource. Server code resolves the source (and
// checks entitlements); this component only displays it.

import type { PlaybackSource } from "../types";

export default function VideoPlayer({ source, title }: { source: PlaybackSource; title: string }) {
  if (source.kind === "embed") {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black">
        <iframe
          src={source.url}
          title={title}
          className="absolute inset-0 h-full w-full"
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }
  return (
    <video className="aspect-video w-full rounded-xl bg-black" controls preload="metadata" poster={source.posterUrl} aria-label={title}>
      <source src={source.url} type={source.mimeType} />
      {source.captions.map((c) => (
        <track key={c.locale} kind="captions" srcLang={c.locale} label={c.label} src={c.url} />
      ))}
    </video>
  );
}

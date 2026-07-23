import Image from "next/image";
import type { CreatorRow } from "@/lib/creators";

type ProfileCardProps = {
  creator: CreatorRow;
};

const PLATFORM_ICONS: Record<string, string> = {
  youtube: "▶ YouTube",
  instagram: "📷 Instagram",
  tiktok: "🎵 TikTok",
  facebook: "👍 Facebook",
};

export default function CreatorProfileCard({ creator }: ProfileCardProps) {
  const platforms: { platform: string; url: string }[] = (() => {
    try {
      return JSON.parse(creator.platforms);
    } catch {
      return [];
    }
  })();

  return (
    <div className="rounded-xl border border-border bg-surface/40 p-6">
      <div className="flex flex-col items-center text-center sm:flex-row sm:text-right">
        {creator.avatar ? (
          <Image
            src={creator.avatar}
            alt={creator.displayName}
            width={80}
            height={80}
            className="h-20 w-20 rounded-full object-cover"
            unoptimized
          />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent/20 text-2xl font-bold text-accent">
            {creator.displayName[0]}
          </div>
        )}
        <div className="sm:mr-5 sm:mt-0 mt-4">
          <h1 className="text-2xl font-bold">{creator.displayName}</h1>
          {creator.bio && <p className="mt-1 text-sm text-muted">{creator.bio}</p>}
          <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm sm:justify-start">
            <span>{creator.approvedSubmissions} فيديو</span>
            {creator.website && (
              <a href={creator.website} target="_blank" rel="noopener noreferrer" className="text-brand-cyan hover:underline">
                الموقع
              </a>
            )}
          </div>
        </div>
      </div>

      {platforms.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          {platforms.map((p, i) => (
            <a
              key={i}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-border px-3 py-1 text-xs transition hover:bg-surface"
            >
              {PLATFORM_ICONS[p.platform] ?? p.platform}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

import type { VideoSubmission } from "@/db/schema";
import SubmissionStatusBadge from "./SubmissionStatusBadge";

type SubmissionCardProps = {
  submission: VideoSubmission;
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
};

export default function SubmissionCard({ submission }: SubmissionCardProps) {
  return (
    <div className="card-glow flex flex-col gap-3 rounded-xl border border-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">{submission.title}</h3>
          {submission.description && (
            <p className="mt-1 line-clamp-2 text-sm text-muted">{submission.description}</p>
          )}
        </div>
        <SubmissionStatusBadge status={submission.status as "pending" | "approved" | "rejected" | "needs_revision"} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        <span>
          {PLATFORM_LABELS[submission.platform] ?? submission.platform}
        </span>
        <a
          href={submission.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand-cyan hover:underline"
        >
          عرض الفيديو
        </a>
        {submission.hashtags && (
          <span># {submission.hashtags}</span>
        )}
        <span className="mr-auto">
          {new Date(submission.createdAt).toLocaleDateString("ar-SA")}
        </span>
      </div>

      {submission.reviewNote && (
        <div className="rounded-lg border border-border bg-black/5 px-3 py-2 text-xs text-muted dark:bg-white/5">
          <span className="font-semibold">ملاحظات المراجعة:</span> {submission.reviewNote}
        </div>
      )}
    </div>
  );
}

import Link from "next/link";
import type { Post } from "@tcf/db/schema";
import SubmissionStatusBadge from "./SubmissionStatusBadge";
import DeletePostButton from "./DeletePostButton";

type SubmissionCardProps = {
  submission: Post;
  creatorDisplayName?: string;
  manageable?: boolean;
};

export default function SubmissionCard({
  submission,
  creatorDisplayName,
  manageable,
}: SubmissionCardProps) {
  const detailHref =
    creatorDisplayName && submission.status === "approved"
      ? `/creators/${encodeURIComponent(creatorDisplayName)}/${submission.id}`
      : null;

  return (
    <div className="card-glow flex flex-col gap-3 rounded-xl border border-border p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">
            {detailHref ? (
              <Link href={detailHref} className="hover:text-accent">
                {submission.title}
              </Link>
            ) : (
              submission.title
            )}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted">{submission.body}</p>
        </div>
        <SubmissionStatusBadge status={submission.status as "pending" | "approved" | "rejected" | "needs_revision"} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        {submission.link && (
          <a
            href={submission.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-brand-cyan hover:underline"
          >
            عرض الرابط
          </a>
        )}
        {submission.hashtags && (
          <span># {submission.hashtags}</span>
        )}
        <span className={manageable ? "" : "mr-auto"}>
          {new Date(submission.createdAt).toLocaleDateString("ar-SA")}
        </span>
        {manageable && (
          <div className="mr-auto flex items-center gap-3">
            <Link
              href={`/creators/submissions/${submission.id}/edit`}
              className="text-brand-cyan hover:underline"
            >
              تعديل
            </Link>
            <DeletePostButton postId={submission.id} />
          </div>
        )}
      </div>

      {submission.reviewNote && (
        <div className="rounded-lg border border-border bg-black/5 px-3 py-2 text-xs text-muted dark:bg-white/5">
          <span className="font-semibold">ملاحظات المراجعة:</span> {submission.reviewNote}
        </div>
      )}
    </div>
  );
}

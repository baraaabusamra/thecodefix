"use client";

import { useRef } from "react";
import {
  approveSubmission,
  rejectSubmission,
  requestRevision,
} from "@/app/admin/creators/submissions/actions";
import type { VideoSubmission } from "@/db/schema";
import SubmissionStatusBadge from "./SubmissionStatusBadge";

type ReviewPanelProps = {
  submission: VideoSubmission;
};

const PLATFORM_LABELS: Record<string, string> = {
  youtube: "YouTube",
  instagram: "Instagram",
  tiktok: "TikTok",
  facebook: "Facebook",
};

export default function SubmissionReviewPanel({ submission }: ReviewPanelProps) {
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const terminal = submission.status === "approved" || submission.status === "rejected";

  return (
    <div className="space-y-6">
      {/* Video embed preview — best-effort for supported platforms */}
      {submission.platform === "youtube" && (
        <div className="aspect-video overflow-hidden rounded-xl">
          <iframe
            src={`https://www.youtube.com/embed/${extractYoutubeId(submission.videoUrl)}`}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* Metadata panel */}
      <div className="rounded-xl border border-border bg-surface/40 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">{submission.title}</h2>
            {submission.description && (
              <p className="mt-2 text-sm text-muted">{submission.description}</p>
            )}
          </div>
          <SubmissionStatusBadge
            status={submission.status as "pending" | "approved" | "rejected" | "needs_revision"}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted">المنصة</span>
            <p className="font-medium">{PLATFORM_LABELS[submission.platform] ?? submission.platform}</p>
          </div>
          {submission.hashtags && (
            <div>
              <span className="text-muted">الوسوم</span>
              <p className="font-medium">{submission.hashtags}</p>
            </div>
          )}
          <div>
            <span className="text-muted">تاريخ الإرسال</span>
            <p className="font-medium">
              {new Date(submission.createdAt).toLocaleDateString("ar-SA")}
            </p>
          </div>
          {submission.duration && (
            <div>
              <span className="text-muted">المدة</span>
              <p className="font-medium">{submission.duration} ثانية</p>
            </div>
          )}
        </div>

        <a
          href={submission.videoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm text-brand-cyan hover:underline"
        >
          فتح الرابط الأصلي ←
        </a>
      </div>

      {/* Review notes display */}
      {submission.reviewNote && (
        <div className="rounded-xl border border-border bg-surface/40 p-5">
          <h3 className="mb-2 text-sm font-semibold text-muted">ملاحظات المراجعة السابقة</h3>
          <p className="text-sm">{submission.reviewNote}</p>
        </div>
      )}

      {/* Actions */}
      {!terminal && (
        <form className="space-y-4 rounded-xl border border-border bg-surface/40 p-5">
          <input type="hidden" name="id" value={submission.id} />
          <div>
            <label htmlFor="reviewNote" className="mb-1 block text-sm font-medium text-muted">
              ملاحظات (اختياري)
            </label>
            <textarea
              ref={noteRef}
              id="reviewNote"
              name="reviewNote"
              rows={3}
              className="w-full rounded-lg border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
              placeholder="سبب الرفض أو ملاحظات التعديل…"
            />
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              formAction={approveSubmission}
              className="rounded-xl bg-green-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
            >
              ✓ اعتماد
            </button>
            <button
              type="submit"
              formAction={requestRevision}
              className="rounded-xl bg-orange-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
            >
              ↻ طلب تعديل
            </button>
            <button
              type="submit"
              formAction={rejectSubmission}
              className="rounded-xl bg-red-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
            >
              ✕ رفض
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function extractYoutubeId(url: string): string {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
  );
  return match?.[1] ?? "";
}

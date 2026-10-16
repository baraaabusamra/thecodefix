"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  approveSubmission,
  rejectSubmission,
  requestRevision,
  deleteSubmission,
} from "../actions/admin-review";
import type { Post } from "@tcf/db/schema";
import SubmissionStatusBadge from "./SubmissionStatusBadge";

type ReviewPanelProps = {
  submission: Post;
};

export default function SubmissionReviewPanel({ submission }: ReviewPanelProps) {
  const noteRef = useRef<HTMLTextAreaElement>(null);

  const terminal = submission.status === "approved" || submission.status === "rejected";

  return (
    <div className="space-y-6">
      {submission.imageUrl && (
        <div className="relative aspect-video overflow-hidden rounded-xl bg-surface/60">
          <Image
            src={submission.imageUrl}
            alt={submission.title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>
      )}

      {/* Metadata panel */}
      <div className="rounded-xl border border-border bg-surface/40 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold">{submission.title}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted">{submission.body}</p>
          </div>
          <SubmissionStatusBadge
            status={submission.status as "pending" | "approved" | "rejected" | "needs_revision"}
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
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
        </div>

        {submission.link && (
          <a
            href={submission.link}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm text-brand-cyan hover:underline"
          >
            فتح الرابط المرفق ←
          </a>
        )}
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

      {/* Delete — always available, e.g. for spam/abuse regardless of status */}
      <form
        action={deleteSubmission}
        onSubmit={(e) => {
          if (!confirm("حذف نهائي لهذا المنشور — متأكد؟")) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={submission.id} />
        <button type="submit" className="text-sm text-red-500 hover:underline">
          🗑️ حذف المنشور نهائيًا
        </button>
      </form>
    </div>
  );
}

"use client";

import { useState, useCallback, useEffect } from "react";
import type { CommentVO } from "@/app/actions/discussion";

export default function LessonDiscussion({
  track,
  lesson,
}: {
  track: string;
  lesson: string;
}) {
  const [comments, setComments] = useState<CommentVO[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const { getComments } = await import("@/app/actions/discussion");
    const list = await getComments(track, lesson);
    setComments(list);
  }, [track, lesson]);

  useEffect(() => { load(); }, [load]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    const fd = new FormData();
    fd.set("track", track);
    fd.set("lesson", lesson);
    fd.set("body", body);
    const { postComment } = await import("@/app/actions/discussion");
    const res = await postComment(fd);
    if (res.ok) { setBody(""); load(); }
    setLoading(false);
  };

  return (
    <section className="mt-12 border-t border-border pt-8">
      <h2 className="mb-6 text-xl font-bold">المناقشة والأسئلة</h2>

      <form onSubmit={handleSubmit} className="mb-8">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="اطرح سؤالاً أو شارك بملاحظة..."
          rows={3}
          className="w-full rounded-xl border border-border bg-surface p-3 text-sm outline-none transition-colors focus:border-accent"
        />
        <button
          type="submit"
          disabled={loading || !body.trim()}
          className="mt-2 rounded-lg bg-brand-purple px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "..." : "نشر"}
        </button>
      </form>

      <div className="space-y-4">
        {comments
          .filter((c) => !c.parentId)
          .map((c) => (
            <CommentCard
              key={c.id}
              comment={c}
              replies={comments.filter((r) => r.parentId === c.id)}
              track={track}
              lesson={lesson}
              onReply={load}
            />
          ))}
        {comments.length === 0 && (
          <p className="text-sm text-muted">لا توجد تعليقات بعد. كن أول من يشارك!</p>
        )}
      </div>
    </section>
  );
}

function CommentCard({
  comment,
  replies,
  track,
  lesson,
  onReply,
}: {
  comment: CommentVO;
  replies: CommentVO[];
  track: string;
  lesson: string;
  onReply: () => void;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyBody, setReplyBody] = useState("");

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    const fd = new FormData();
    fd.set("track", track);
    fd.set("lesson", lesson);
    fd.set("parentId", comment.id);
    fd.set("body", replyBody);
    const { postComment } = await import("@/app/actions/discussion");
    await postComment(fd);
    setReplyBody("");
    setShowReply(false);
    onReply();
  };

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted">
        <span className="font-semibold text-foreground">{comment.authorName}</span>
        <span>{new Date(comment.createdAt).toLocaleDateString("ar-SA")}</span>
      </div>
      <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={() => setShowReply(!showReply)}
          className="text-xs text-accent transition hover:underline"
        >
          {showReply ? "إلغاء" : "رد"}
        </button>
      </div>

      {showReply && (
        <form onSubmit={handleReply} className="mt-3">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="اكتب ردّك..."
            rows={2}
            className="w-full rounded-lg border border-border bg-surface-2 p-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={!replyBody.trim()}
            className="mt-1 rounded-lg bg-brand-purple px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
          >
            نشر الرد
          </button>
        </form>
      )}

      {replies.length > 0 && (
        <div className="mt-3 mr-4 space-y-3 border-r-2 border-border pr-3">
          {replies.map((r) => (
            <div key={r.id}>
              <div className="mb-0.5 flex items-center gap-2 text-xs text-muted">
                <span className="font-semibold text-foreground">{r.authorName}</span>
                <span>{new Date(r.createdAt).toLocaleDateString("ar-SA")}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { Forbidden } from "../../_components/gates";
import { getPendingComments, getAllComments, approveComment, deleteComment } from "./actions";

export const metadata: Metadata = {
  title: "إدارة التعليقات",
  robots: { index: false, follow: false },
};

export default async function CommentsPage() {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "content:edit")) return <Forbidden role={access.role} />;

  const pending = await getPendingComments();
  const all = await getAllComments();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">التعليقات والمناقشات</h1>
        <p className="mt-1 text-sm text-muted">
          إدارة تعليقات المستخدمين على الدروس
        </p>
      </div>

      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-amber-400">
            📬 في انتظار المراجعة ({pending.length})
          </h2>
          <div className="space-y-3">
            {pending.map((c) => (
              <CommentRow
                key={c.id}
                comment={c}
                approveComment={approveComment}
                deleteComment={deleteComment}
              />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">جميع التعليقات ({all.length})</h2>
        <div className="space-y-2">
          {all.map((c) => (
            <div
              key={c.id}
              className={`rounded-xl border p-3 text-sm ${
                c.isApproved
                  ? "border-border bg-surface"
                  : "border-amber-500/30 bg-amber-500/5"
              }`}
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-muted">
                <span className="font-semibold text-foreground">{c.authorName}</span>
                <span>{c.track}/{c.lesson}</span>
                {!c.isApproved && (
                  <span className="rounded bg-amber-500/20 px-1.5 text-amber-400">قيد المراجعة</span>
                )}
              </div>
              <p className="whitespace-pre-wrap">{c.body}</p>
              {c.parentId && <p className="mt-1 text-xs text-muted">رد على تعليق</p>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CommentRow({
  comment,
  approveComment,
  deleteComment,
}: {
  comment: { id: string; authorName: string; track: string; lesson: string; body: string; createdAt: Date };
  approveComment: (fd: FormData) => Promise<void>;
  deleteComment: (fd: FormData) => Promise<void>;
}) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs text-muted">
        <span className="font-semibold text-foreground">{comment.authorName}</span>
        <span>{comment.track}/{comment.lesson}</span>
        <span>{new Date(comment.createdAt).toLocaleDateString("ar-SA")}</span>
      </div>
      <p className="mb-2 text-sm whitespace-pre-wrap">{comment.body}</p>
      <div className="flex gap-2">
        <form action={approveComment}>
          <input type="hidden" name="id" value={comment.id} />
          <button type="submit" className="rounded-lg bg-green-600 px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90">
            ✓ قبول
          </button>
        </form>
        <form action={deleteComment}>
          <input type="hidden" name="id" value={comment.id} />
          <button type="submit" className="rounded-lg bg-red-600 px-3 py-1 text-xs font-semibold text-white transition hover:opacity-90">
            ✗ حذف
          </button>
        </form>
      </div>
    </div>
  );
}

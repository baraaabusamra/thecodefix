"use client";

import { deleteOwnPost } from "@/app/creators/submissions/actions";

export default function DeletePostButton({ postId }: { postId: string }) {
  return (
    <form
      action={deleteOwnPost}
      onSubmit={(e) => {
        if (!confirm("متأكد إنك بدك تحذف هذا المنشور؟ لا يمكن التراجع.")) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="postId" value={postId} />
      <button type="submit" className="text-red-500 hover:underline">
        حذف
      </button>
    </form>
  );
}

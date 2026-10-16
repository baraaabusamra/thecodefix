"use client";

import { useActionState } from "react";
import { updateOwnPost, type EditState } from "../actions/edit-post";
import type { Post } from "@tcf/db/schema";

const initialState: EditState = { success: false, message: "" };

export default function EditPostForm({ post }: { post: Post }) {
  const boundAction = updateOwnPost.bind(null, post.id);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <div className="mx-auto flex max-w-lg flex-col px-4 py-16">
      <h1 className="text-2xl font-bold">تعديل المنشور</h1>
      <p className="mt-2 text-sm text-muted">
        أي تعديل يعيد المنشور لحالة &quot;قيد المراجعة&quot; حتى لو كان معتمدًا سابقًا.
      </p>

      {state.message && !state.errors && (
        <p
          role="alert"
          className="mt-6 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-500"
        >
          {state.message}
        </p>
      )}

      <form action={formAction} className="mt-8 flex flex-col gap-5">
        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium">
            العنوان <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={state.fields?.title ?? post.title}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
          />
          {state.errors?.title && (
            <p className="mt-1 text-xs text-red-500">{state.errors.title[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="body" className="mb-1 block text-sm font-medium">
            النص <span className="text-red-500">*</span>
          </label>
          <textarea
            id="body"
            name="body"
            rows={5}
            required
            defaultValue={state.fields?.body ?? post.body}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
          />
          {state.errors?.body && (
            <p className="mt-1 text-xs text-red-500">{state.errors.body[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="imageUrl" className="mb-1 block text-sm font-medium">
            رابط صورة (اختياري)
          </label>
          <input
            id="imageUrl"
            name="imageUrl"
            type="url"
            defaultValue={state.fields?.imageUrl ?? post.imageUrl ?? ""}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
          />
          {state.errors?.imageUrl && (
            <p className="mt-1 text-xs text-red-500">{state.errors.imageUrl[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="link" className="mb-1 block text-sm font-medium">
            رابط خارجي (اختياري)
          </label>
          <input
            id="link"
            name="link"
            type="url"
            defaultValue={state.fields?.link ?? post.link ?? ""}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
          />
          {state.errors?.link && (
            <p className="mt-1 text-xs text-red-500">{state.errors.link[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="hashtags" className="mb-1 block text-sm font-medium">
            الوسوم (مفصولة بفواصل)
          </label>
          <input
            id="hashtags"
            name="hashtags"
            type="text"
            defaultValue={state.fields?.hashtags ?? post.hashtags ?? ""}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
          />
          {state.errors?.hashtags && (
            <p className="mt-1 text-xs text-red-500">{state.errors.hashtags[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="btn-neon mt-2 w-full rounded-xl px-4 py-3 font-semibold transition disabled:opacity-50"
        >
          {pending ? "جارٍ الحفظ…" : "حفظ وإعادة الإرسال للمراجعة"}
        </button>
      </form>
    </div>
  );
}

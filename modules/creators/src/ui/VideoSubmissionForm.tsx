"use client";

import { useActionState } from "react";
import { submitVideo, type SubmitState } from "../actions/submit";
import type { CreatorRow } from "../creators";

const initialState: SubmitState = { success: false, message: "" };

type PostFormProps = {
  pages: CreatorRow[];
  activeId: string;
};

export default function PostForm({ pages, activeId }: PostFormProps) {
  const [state, formAction, pending] = useActionState(submitVideo, initialState);

  return (
    <div className="mx-auto flex max-w-lg flex-col px-4 py-16">
      <h1 className="text-2xl font-bold">منشور جديد</h1>
      <p className="mt-2 text-sm text-muted">
        نص + صورة اختيارية + رابط اختياري — يُنشر بعد موافقة فريقنا.
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
        {pages.length > 1 && (
          <div>
            <label htmlFor="creatorId" className="mb-1 block text-sm font-medium">
              النشر باسم <span className="text-red-500">*</span>
            </label>
            <select
              id="creatorId"
              name="creatorId"
              required
              defaultValue={state.fields?.creatorId ?? activeId}
              className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>
        )}
        {pages.length <= 1 && (
          <input type="hidden" name="creatorId" value={activeId} />
        )}

        <div>
          <label htmlFor="title" className="mb-1 block text-sm font-medium">
            العنوان <span className="text-red-500">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            defaultValue={state.fields?.title ?? ""}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
            placeholder="مثال: شرح دالة map في JavaScript"
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
            defaultValue={state.fields?.body ?? ""}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
            placeholder="اكتب منشورك هنا…"
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
            defaultValue={state.fields?.imageUrl ?? ""}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
            placeholder="https://example.com/image.jpg"
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
            defaultValue={state.fields?.link ?? ""}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
            placeholder="فيديو يوتيوب، مقال، أي رابط ذو صلة"
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
            defaultValue={state.fields?.hashtags ?? ""}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
            placeholder="javascript,برمجة,web"
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
          {pending ? "جاري الإرسال…" : "إرسال للمراجعة"}
        </button>
      </form>
    </div>
  );
}

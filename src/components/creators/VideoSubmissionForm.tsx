"use client";

import { useActionState } from "react";
import { submitVideo, type SubmitState } from "@/app/creators/submit/actions";

const initialState: SubmitState = { success: false, message: "" };

const PLATFORMS = [
  { value: "", label: "اختر المنصة" },
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "facebook", label: "Facebook" },
];

export default function VideoSubmissionForm() {
  const [state, formAction, pending] = useActionState(submitVideo, initialState);

  return (
    <div className="mx-auto flex max-w-lg flex-col px-4 py-16">
      <h1 className="text-2xl font-bold">إرسال فيديو جديد</h1>
      <p className="mt-2 text-sm text-muted">
        أرسل فيديو تعليميًا من YouTube أو Instagram أو TikTok أو Facebook للمراجعة.
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
            عنوان الفيديو <span className="text-red-500">*</span>
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
          <label htmlFor="description" className="mb-1 block text-sm font-medium">
            وصف الفيديو
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={state.fields?.description ?? ""}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
            placeholder="شرح مختصر عن محتوى الفيديو…"
          />
          {state.errors?.description && (
            <p className="mt-1 text-xs text-red-500">{state.errors.description[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="platform" className="mb-1 block text-sm font-medium">
            المنصة <span className="text-red-500">*</span>
          </label>
          <select
            id="platform"
            name="platform"
            required
            defaultValue={state.fields?.platform ?? ""}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {state.errors?.platform && (
            <p className="mt-1 text-xs text-red-500">{state.errors.platform[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="videoUrl" className="mb-1 block text-sm font-medium">
            رابط الفيديو <span className="text-red-500">*</span>
          </label>
          <input
            id="videoUrl"
            name="videoUrl"
            type="url"
            required
            defaultValue={state.fields?.videoUrl ?? ""}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
            placeholder="https://youtube.com/watch?v=…"
          />
          {state.errors?.videoUrl && (
            <p className="mt-1 text-xs text-red-500">{state.errors.videoUrl[0]}</p>
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
          {pending ? "جاري الإرسال…" : "إرسال الفيديو للمراجعة"}
        </button>
      </form>
    </div>
  );
}

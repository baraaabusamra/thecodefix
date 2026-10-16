"use client";

import { useActionState } from "react";
import { registerCreator, type RegisterState } from "../actions/register";

const initialState: RegisterState = {
  success: false,
  message: "",
};

export default function CreatorRegisterForm() {
  const [state, formAction, pending] = useActionState(registerCreator, initialState);

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-16">
      <h1 className="text-2xl font-bold">التسجيل كمنشئ محتوى</h1>
      <p className="mt-2 text-sm text-muted">
        املأ البيانات أدناه لإنشاء حساب مبدع والبدء بإرسال فيديوهاتك للمراجعة.
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
          <label htmlFor="displayName" className="mb-1 block text-sm font-medium">
            اسم العرض <span className="text-red-500">*</span>
          </label>
          <input
            id="displayName"
            name="displayName"
            type="text"
            required
            defaultValue={state.fields?.displayName ?? ""}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
            placeholder="اسمك أو اسم قناتك"
          />
          {state.errors?.displayName && (
            <p className="mt-1 text-xs text-red-500">{state.errors.displayName[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="bio" className="mb-1 block text-sm font-medium">
            نبذة عنك
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            defaultValue={state.fields?.bio ?? ""}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
            placeholder="اختصاصك، خبراتك، مجالك…"
          />
          {state.errors?.bio && (
            <p className="mt-1 text-xs text-red-500">{state.errors.bio[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="website" className="mb-1 block text-sm font-medium">
            موقع إلكتروني
          </label>
          <input
            id="website"
            name="website"
            type="url"
            defaultValue={state.fields?.website ?? ""}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
            placeholder="https://example.com"
          />
          {state.errors?.website && (
            <p className="mt-1 text-xs text-red-500">{state.errors.website[0]}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="btn-neon mt-2 w-full rounded-xl px-4 py-3 font-semibold transition disabled:opacity-50"
        >
          {pending ? "جاري التسجيل…" : "تسجيل كمنشئ محتوى"}
        </button>
      </form>
    </div>
  );
}

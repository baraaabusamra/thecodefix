"use client";

import { useActionState } from "react";
import { updateOwnCreatorProfile, type EditProfileState } from "../actions/edit-profile";
import type { CreatorRow } from "../creators";

const initialState: EditProfileState = { success: false, message: "" };

export default function EditProfileForm({ creator }: { creator: CreatorRow }) {
  const boundAction = updateOwnCreatorProfile.bind(null, creator.id);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  return (
    <div className="mx-auto flex max-w-lg flex-col px-4 py-16">
      <h1 className="text-2xl font-bold">تعديل صفحة {creator.displayName}</h1>
      <p className="mt-2 text-sm text-muted">
        اسم الصفحة ثابت (هو رابطها العام) — عدّل النبذة والصورة والموقع فقط.
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
          <label className="mb-1 block text-sm font-medium text-muted">اسم الصفحة</label>
          <input
            type="text"
            disabled
            value={creator.displayName}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm text-muted outline-none dark:bg-white/5"
          />
        </div>

        <div>
          <label htmlFor="bio" className="mb-1 block text-sm font-medium">
            نبذة
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            defaultValue={state.fields?.bio ?? creator.bio ?? ""}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
          />
          {state.errors?.bio && (
            <p className="mt-1 text-xs text-red-500">{state.errors.bio[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="avatar" className="mb-1 block text-sm font-medium">
            رابط صورة الملف الشخصي
          </label>
          <input
            id="avatar"
            name="avatar"
            type="url"
            defaultValue={state.fields?.avatar ?? creator.avatar ?? ""}
            className="w-full rounded-xl border border-border bg-black/5 px-4 py-3 text-sm outline-none transition focus:border-accent dark:bg-white/5"
            placeholder="https://example.com/avatar.jpg"
          />
          {state.errors?.avatar && (
            <p className="mt-1 text-xs text-red-500">{state.errors.avatar[0]}</p>
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
            defaultValue={state.fields?.website ?? creator.website ?? ""}
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
          {pending ? "جارٍ الحفظ…" : "حفظ التعديلات"}
        </button>
      </form>
    </div>
  );
}

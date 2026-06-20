import Link from "next/link";
import { ROLE_LABELS, type Role } from "@/lib/rbac";
import { submitAdminKey } from "../actions";

// Full-screen access gates rendered by the admin layout when access is denied.

export function GateScreen({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-sm px-4 py-20 text-center">{children}</div>;
}

export function AdminGate({ denied }: { denied?: boolean }) {
  return (
    <>
      <h1 className="text-2xl font-bold">لوحة الإدارة</h1>
      <p className="mt-2 text-sm text-muted">أدخل مفتاح الوصول للمتابعة.</p>
      <form action={submitAdminKey} className="mt-6 flex flex-col gap-3">
        <input
          name="key"
          type="password"
          autoFocus
          placeholder="مفتاح الوصول"
          className="rounded-lg border border-border bg-surface px-4 py-2 text-center outline-none focus:border-brand-purple"
        />
        <button className="rounded-lg bg-brand-purple px-4 py-2 font-semibold text-white transition hover:opacity-90">
          دخول
        </button>
      </form>
      {denied && <p className="mt-4 text-sm text-red-500">مفتاح غير صحيح.</p>}
      <p className="mt-3 text-xs text-muted">تبقى الجلسة مفتوحة 8 ساعات.</p>
    </>
  );
}

export function SignInPrompt() {
  return (
    <>
      <h1 className="text-2xl font-bold">لوحة الإدارة</h1>
      <p className="mt-2 text-sm text-muted">
        سجّل الدخول بحساب لديه صلاحية الوصول.
      </p>
      <Link
        href="/api/auth/signin?callbackUrl=/admin"
        className="mt-6 inline-block rounded-lg bg-brand-purple px-6 py-2 font-semibold text-white transition hover:opacity-90"
      >
        تسجيل الدخول
      </Link>
    </>
  );
}

export function Forbidden({ role }: { role?: Role }) {
  return (
    <>
      <h1 className="text-2xl font-bold">غير مصرّح</h1>
      <p className="mt-2 text-sm text-muted">
        حسابك{role ? ` (${ROLE_LABELS[role]})` : ""} لا يملك صلاحية الوصول إلى
        هذا القسم.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-lg border border-border px-6 py-2 font-semibold transition hover:bg-surface"
      >
        العودة للرئيسية
      </Link>
    </>
  );
}

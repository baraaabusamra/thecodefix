// Shown by DB-backed sections when DATABASE_URL is not yet configured.
export default function NeedsDatabase({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`rounded-xl border border-dashed border-border text-center ${
        compact ? "p-4" : "p-8"
      }`}
    >
      <p className="text-lg font-bold">قاعدة البيانات غير مفعّلة</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        هذا القسم يحتاج قاعدة بيانات لعرض بيانات حقيقية. وفّر قاعدة Neon من Vercel
        Marketplace أو neon.tech، اضبط <code className="font-mono">DATABASE_URL</code>،
        ثم نفّذ الترحيل.
      </p>
      <div className="mt-4 inline-flex flex-col gap-1 rounded-lg bg-surface px-4 py-3 text-start font-mono text-xs text-muted">
        <span>DATABASE_URL=postgresql://…</span>
        <span>npm run db:migrate</span>
      </div>
    </div>
  );
}

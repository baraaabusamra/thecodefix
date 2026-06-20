export default function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-6 text-sm text-muted md:flex-row">
        <p>© {new Date().getFullYear()} The Code Fix — المرجع العربي الأول للبرمجة</p>
        <p className="neon-text font-semibold">ابنِ. علّم. اربح.</p>
      </div>
    </footer>
  );
}

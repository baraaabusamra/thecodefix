import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import { resolveAdmin } from "@/lib/admin-access";
import { can } from "@/lib/rbac";
import { Forbidden } from "../_components/gates";
import { getTracks, getLessons } from "@/lib/content";
import {
  CHANGELOG,
  type ChangeCategory,
  type ChangeEntry,
} from "@/lib/changelog";

export const metadata: Metadata = {
  title: "سجل التطوير",
  robots: { index: false, follow: false },
};

// Recursively sum the byte size of a directory (for the live "content size").
function dirSize(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    total += stat.isDirectory() ? dirSize(p) : stat.size;
  }
  return total;
}

function formatKB(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " م.ب";
  return Math.round(bytes / 1024) + " ك.ب";
}

const CAT_STYLE: Record<ChangeCategory, string> = {
  ميزة: "bg-brand-purple/15 text-brand-purple",
  محتوى: "bg-brand-cyan/15 text-brand-cyan",
  بنية: "bg-amber-500/15 text-amber-500",
  تحسين: "bg-green-500/15 text-green-500",
};

export default async function AdminChangelogPage() {
  const access = await resolveAdmin();
  if (!access.ok) return null;
  if (!can(access.role, "content:edit"))
    return <Forbidden role={access.role} />;

  // Live stats
  const tracks = await getTracks();
  const lessonCounts = await Promise.all(
    tracks.map((t) => getLessons(t.slug).then((l) => l.length))
  );
  const totalLessons = lessonCounts.reduce((a, b) => a + b, 0);
  const completeTracks = lessonCounts.filter((n) => n >= 20).length;

  const quizDir = path.join(process.cwd(), "src", "content", "quizzes");
  const quizCount = fs.existsSync(quizDir)
    ? fs.readdirSync(quizDir).filter((f) => f.endsWith(".json")).length
    : 0;
  const contentSize = formatKB(
    dirSize(path.join(process.cwd(), "src", "content"))
  );

  const done = CHANGELOG.filter((c) => c.status === "done");
  const planned = CHANGELOG.filter((c) => c.status === "planned");

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold">📋 سجل التطوير</h1>
        <p className="mt-1 text-sm text-muted">
          كل ما أُضيف إلى المنصّة وما سيُضاف — مع التاريخ والحجم والوظائف المشمولة.
        </p>
      </div>

      {/* Live stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="المسارات" value={`${tracks.length}`} />
        <Stat label="المسارات المكتملة" value={`${completeTracks}`} />
        <Stat label="إجمالي الدروس" value={`${totalLessons}`} />
        <Stat label="الاختبارات" value={`${quizCount}`} />
        <Stat label="حجم المحتوى" value={contentSize} />
        <Stat label="سجلّات مُنجزة" value={`${done.length}`} />
        <Stat label="مخطّط لها" value={`${planned.length}`} />
        <Stat label="آخر تحديث" value={done[0]?.date ?? "—"} />
      </div>

      {/* Done timeline */}
      <section>
        <h2 className="mb-4 text-lg font-bold">✅ ما تمّ إنجازه</h2>
        <div className="space-y-4">
          {done.map((e, i) => (
            <EntryCard key={i} entry={e} />
          ))}
        </div>
      </section>

      {/* Planned */}
      <section>
        <h2 className="mb-4 text-lg font-bold">🗺️ ما سيُضاف لاحقًا</h2>
        <div className="space-y-4">
          {planned.map((e, i) => (
            <EntryCard key={i} entry={e} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 text-center">
      <p className="text-2xl font-bold neon-text">{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}

function EntryCard({ entry }: { entry: ChangeEntry }) {
  const planned = entry.status === "planned";
  return (
    <div
      className={`rounded-2xl border bg-surface p-5 ${
        planned ? "border-dashed border-border" : "border-border"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${CAT_STYLE[entry.category]}`}
        >
          {entry.category}
        </span>
        <h3 className="font-bold">{entry.title}</h3>
        <span className="ms-auto flex items-center gap-2 text-xs text-muted">
          <span className="rounded bg-background px-2 py-0.5">📦 {entry.size}</span>
          <span className="rounded bg-background px-2 py-0.5">📅 {entry.date}</span>
        </span>
      </div>
      <ul className="space-y-1.5 text-sm text-foreground/90">
        {entry.items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span className={planned ? "text-muted" : "text-green-500"}>
              {planned ? "○" : "✓"}
            </span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

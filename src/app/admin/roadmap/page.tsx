import type { Metadata } from "next";
import { requireAdminCapability } from "@/lib/admin-access";
import {
  ROADMAP,
  ROADMAP_STREAMS,
  type RoadmapStream,
} from "@/lib/roadmap";

export const metadata: Metadata = {
  title: "الخريطة الاستراتيجية",
  robots: { index: false, follow: false },
};

const STREAM_STYLE: Record<RoadmapStream, string> = {
  "هندسة ومنتج": "bg-brand-purple/15 text-brand-purple",
  "محتوى و SEO": "bg-brand-cyan/15 text-brand-cyan",
  "تسويق ونموّ": "bg-green-500/15 text-green-500",
};

export default async function AdminRoadmapPage() {
  await requireAdminCapability("content:edit");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">🗺️ الخريطة الاستراتيجية</h1>
        <p className="mt-1 text-sm text-muted">
          الرؤية الكبرى لعام كامل — من الربع الثالث 2026 إلى الربع الثاني 2027،
          عبر ثلاثة مسارات.
        </p>
      </div>

      {/* Stream legend */}
      <div className="flex flex-wrap gap-2">
        {ROADMAP_STREAMS.map((s) => (
          <span
            key={s}
            className={`rounded-full px-3 py-1 text-xs font-bold ${STREAM_STYLE[s]}`}
          >
            {s}
          </span>
        ))}
      </div>

      {/* Quarter timeline */}
      <div className="space-y-6">
        {ROADMAP.map((q) => (
          <section
            key={q.id}
            className="rounded-2xl border border-border bg-surface p-6"
          >
            <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="rounded-full bg-background px-3 py-1 text-sm font-bold neon-text">
                {q.id}
              </span>
              <h2 className="text-lg font-bold">{q.theme}</h2>
              <span className="ms-auto text-xs text-muted">
                {q.label} · {q.window}
              </span>
            </div>

            <div className="space-y-3">
              {q.items.map((it, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-background p-4"
                >
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STREAM_STYLE[it.stream]}`}
                    >
                      {it.stream}
                    </span>
                    <h3 className="font-semibold">{it.title}</h3>
                  </div>
                  <p className="text-sm text-muted">{it.detail}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="text-center text-xs text-muted">
        رؤية داخلية للتخطيط — تُحدَّث في{" "}
        <code className="rounded bg-surface px-1.5 py-0.5">src/lib/roadmap.ts</code>
      </p>
    </div>
  );
}

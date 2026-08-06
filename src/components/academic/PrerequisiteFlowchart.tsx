import Link from "next/link";
import type { FlowGraph, FlowKind } from "@/lib/prerequisite-graph";

const COL_W = 226;
const ROW_H = 108;
const NODE_W = 192;
const NODE_H = 80;
const PAD = 24;

const KIND_COLOR: Record<FlowKind, string> = {
  college: "#26E5FF",
  specialization: "#B026FF",
};
const KIND_LABEL: Record<FlowKind, string> = {
  college: "إجباري كلية",
  specialization: "إجباري تخصص",
};

function center(col: number, row: number) {
  return { x: PAD + col * COL_W, y: PAD + row * ROW_H };
}

export default function PrerequisiteFlowchart({
  graph,
  country,
  university,
}: {
  graph: FlowGraph;
  country: string;
  university: string;
}) {
  if (graph.nodes.length === 0) return null;

  const width = PAD * 2 + graph.colCount * COL_W;
  const height = PAD * 2 + graph.rowCount * ROW_H;
  const byNumber = new Map(graph.nodes.map((n) => [n.number, n]));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-center gap-4 text-xs">
        {(Object.keys(KIND_COLOR) as FlowKind[]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: KIND_COLOR[k] }}
            />
            {KIND_LABEL[k]}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-muted">
          <span aria-hidden>→</span> يفتح المادة التالية
        </span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-surface/30 p-2">
        <div
          className="relative"
          style={{ width: Math.max(width, NODE_W + PAD * 2), height }}
        >
          <svg
            width={width}
            height={height}
            className="pointer-events-none absolute inset-0"
            aria-hidden
          >
            <defs>
              <marker
                id="flow-arrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="7"
                markerHeight="7"
                orient="auto-start-reverse"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="var(--border)" />
              </marker>
            </defs>
            {graph.edges.map((e, i) => {
              const from = byNumber.get(e.from);
              const to = byNumber.get(e.to);
              if (!from || !to) return null;
              const a = center(from.col, from.row);
              const b = center(to.col, to.row);
              const x1 = a.x + NODE_W;
              const y1 = a.y + NODE_H / 2;
              const x2 = b.x;
              const y2 = b.y + NODE_H / 2;
              const mx = (x1 + x2) / 2;
              return (
                <path
                  key={i}
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2 - 8} ${y2}`}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth={1.5}
                  markerEnd="url(#flow-arrow)"
                />
              );
            })}
          </svg>

          {graph.nodes.map((n) => {
            const { x, y } = center(n.col, n.row);
            const color = KIND_COLOR[n.kind];
            return (
              <Link
                key={n.number}
                href={`/academic/${country}/${university}/course/${n.number}`}
                className="group absolute flex flex-col justify-center rounded-xl border p-2.5 transition hover:-translate-y-0.5"
                style={{
                  left: x,
                  top: y,
                  width: NODE_W,
                  height: NODE_H,
                  borderColor: `color-mix(in srgb, ${color} 45%, var(--border))`,
                  backgroundColor: `color-mix(in srgb, ${color} 10%, var(--surface))`,
                  boxShadow: `0 0 0 transparent`,
                }}
              >
                <span
                  className="block truncate font-mono text-[10px]"
                  style={{ color }}
                  dir="ltr"
                >
                  {n.number}
                </span>
                <span
                  className="block truncate text-sm font-bold group-hover:neon-text"
                  dir="ltr"
                  title={n.labName ? `${n.name} + ${n.labName}` : n.name}
                >
                  {n.name}
                  {n.labName ? " + مختبر" : ""}
                </span>
                <span className="block text-[11px] tabular-nums text-muted">
                  {n.creditHours} ساعة
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

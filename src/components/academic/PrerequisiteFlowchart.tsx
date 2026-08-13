import Link from "next/link";
import type { FlowGraph, FlowKind } from "@/lib/prerequisite-graph";

// Top-down org-chart layout: col = prerequisite depth (rendered as the
// vertical axis, root at top), row = position among siblings at that depth
// (rendered as the horizontal axis). Every edge is drawn as a right-angle
// elbow from a parent's bottom edge to a child's top edge, the same shape as
// the printed curriculum-flowchart posters this is modeled on.
const COL_GAP = 204; // horizontal spacing between siblings
const ROW_GAP = 132; // vertical spacing between depth levels
const NODE_W = 176;
const NODE_H = 72;
const PAD = 28;

const KIND_COLOR: Record<FlowKind, string> = {
  college: "#26E5FF",
  specialization: "#B026FF",
  elective: "#FF6EC7",
};
const KIND_LABEL: Record<FlowKind, string> = {
  college: "إجباري كلية",
  specialization: "إجباري تخصص",
  elective: "اختياري تخصص",
};

function topLeft(col: number, row: number) {
  return { x: PAD + row * COL_GAP, y: PAD + col * ROW_GAP };
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

  const width = PAD * 2 + graph.rowCount * COL_GAP;
  const height = PAD * 2 + graph.colCount * ROW_GAP;
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
      </div>

      <div
        dir="ltr"
        className="overflow-x-auto rounded-2xl border border-border bg-surface/30 p-3"
      >
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
                refX="5"
                refY="9"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0,0 L10,0 L5,10 z" fill="var(--border)" />
              </marker>
            </defs>
            {graph.edges.map((e, i) => {
              const from = byNumber.get(e.from);
              const to = byNumber.get(e.to);
              if (!from || !to) return null;
              const a = topLeft(from.col, from.row);
              const b = topLeft(to.col, to.row);
              const px = a.x + NODE_W / 2;
              const py = a.y + NODE_H;
              const cx = b.x + NODE_W / 2;
              const cy = b.y;
              const midY = py + (cy - py) / 2;
              return (
                <path
                  key={i}
                  d={`M ${px} ${py} V ${midY} H ${cx} V ${cy - 6}`}
                  fill="none"
                  stroke="var(--border)"
                  strokeWidth={1.5}
                  markerEnd="url(#flow-arrow)"
                />
              );
            })}
          </svg>

          {graph.nodes.map((n) => {
            const { x, y } = topLeft(n.col, n.row);
            const color = KIND_COLOR[n.kind];
            return (
              <Link
                key={n.number}
                href={`/academic/${country}/${university}/course/${n.number}`}
                className="group absolute flex flex-col justify-center rounded-xl border p-2.5 text-center transition hover:-translate-y-0.5"
                style={{
                  left: x,
                  top: y,
                  width: NODE_W,
                  height: NODE_H,
                  borderColor: `color-mix(in srgb, ${color} 45%, var(--border))`,
                  backgroundColor: `color-mix(in srgb, ${color} 12%, var(--surface))`,
                }}
              >
                <span
                  className="block truncate text-sm font-bold group-hover:neon-text"
                  dir="ltr"
                  title={n.labName ? `${n.name} + ${n.labName}` : n.name}
                >
                  {n.name}
                  {n.labName ? " + مختبر" : ""}
                </span>
                <span className="mt-0.5 flex items-center justify-center gap-1.5 text-[11px] text-muted">
                  <span className="font-mono" dir="ltr">
                    {n.number}
                  </span>
                  <span className="tabular-nums">· {n.creditHours} س</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

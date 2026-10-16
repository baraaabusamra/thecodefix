import type { FlowGraph, FlowKind, FlowNode } from "../prerequisite-graph";

// Renders as one scalable SVG (viewBox + width:100%) instead of an
// absolutely-positioned HTML/overflow-scroll hybrid — the whole diagram
// shrinks to fit its container like a poster image, no horizontal scroll,
// while every node stays a real clickable <a> pointing at its course page.
const COL_GAP = 188;
const ROW_GAP = 108;
const NODE_W = 164;
const NODE_H = 60;
const PAD = 32;
const HEADER_H = 84;
const LEGEND_H = 56;

const KIND_COLOR: Record<FlowKind, string> = {
  college: "#FF7A18",
  specialization: "#B026FF",
  elective: "#FF3D9A",
};
const KIND_LABEL: Record<FlowKind, string> = {
  college: "إجباري كلية",
  specialization: "إجباري تخصص",
  elective: "اختياري تخصص",
};

const ICON_RULES: [RegExp, string][] = [
  [/data ?base/i, "🗄️"],
  [/network|wireless|internet|protocol/i, "📡"],
  [/security|secur/i, "🔒"],
  [/artificial intelligence|\bai\b/i, "🤖"],
  [/web|internet application/i, "🌐"],
  [/operating system/i, "⚙️"],
  [/architecture|organization/i, "🧩"],
  [/physics/i, "⚛️"],
  [/calculus|algebra|numerical|discrete|statistics/i, "🔢"],
  [/graphic|multimedia|visual/i, "🎨"],
  [/project|training/i, "🎓"],
  [/algorithm|theory of computation/i, "🧠"],
  [/mobile/i, "📱"],
  [/mining|analysis|design/i, "📊"],
  [/object oriented|programming|software|java|c\+\+|vb\b/i, "💻"],
];
function iconFor(name: string): string {
  for (const [re, icon] of ICON_RULES) if (re.test(name)) return icon;
  return "📘";
}

function wrapLines(text: string, maxChars = 16, maxLines = 2): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  let consumedWords = 0;
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxChars && line) {
      lines.push(line);
      consumedWords += line.split(" ").length;
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (lines.length < maxLines && line) {
    lines.push(line);
    consumedWords += line.split(" ").length;
  }
  if (consumedWords < words.length) {
    const last = lines[maxLines - 1] ?? "";
    lines[maxLines - 1] = last.length > 3 ? `${last.slice(0, last.length - 1)}…` : `${last}…`;
  }
  return lines;
}

function topLeft(col: number, row: number) {
  return { x: PAD + row * COL_GAP, y: HEADER_H + col * ROW_GAP };
}

function NodeBox({
  n,
  country,
  university,
}: {
  n: FlowNode;
  country: string;
  university: string;
}) {
  const { x, y } = topLeft(n.col, n.row);
  const color = KIND_COLOR[n.kind];
  const lines = wrapLines(n.name);
  return (
    <a href={`/academic/${country}/${university}/course/${n.number}`}>
      <rect
        x={x}
        y={y}
        width={NODE_W}
        height={NODE_H}
        rx={14}
        fill="color-mix(in srgb, var(--surface) 92%, black)"
        stroke={color}
        strokeWidth={1.75}
      />
      <text x={x + 14} y={y + 24} fontSize={14} textAnchor="start" style={{ pointerEvents: "none" }}>
        {iconFor(n.name)}
      </text>
      {lines.map((l, i) => (
        <text
          key={i}
          x={x + NODE_W / 2 + 8}
          y={y + 22 + i * 15}
          fontSize={11.5}
          fontWeight={700}
          textAnchor="middle"
          fill="var(--foreground)"
          style={{ pointerEvents: "none" }}
        >
          {l}
        </text>
      ))}
      <text
        x={x + NODE_W / 2 + 8}
        y={y + NODE_H - 10}
        fontSize={9.5}
        textAnchor="middle"
        fill="var(--muted)"
        style={{ pointerEvents: "none" }}
      >
        {n.number} · {n.creditHours} س
      </text>
    </a>
  );
}

export default function PrerequisiteFlowchart({
  graph,
  country,
  university,
  title,
}: {
  graph: FlowGraph;
  country: string;
  university: string;
  title: string;
}) {
  if (graph.nodes.length === 0) return null;

  const width = PAD * 2 + graph.rowCount * COL_GAP;
  const height = HEADER_H + graph.colCount * ROW_GAP + LEGEND_H;
  const byNumber = new Map(graph.nodes.map((n) => [n.number, n]));
  const kindsUsed = [...new Set(graph.nodes.map((n) => n.kind))] as FlowKind[];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface/30 p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="auto"
        role="img"
        aria-label={`مخطط متطلبات ${title}`}
        style={{ direction: "ltr" }}
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

        {/* Header: logo + title */}
        <image href="/logo.png" x={PAD} y={16} width={28} height={28} />
        <text x={PAD + 36} y={36} fontSize={16} fontWeight={800} fill="var(--foreground)">
          The Code Fix
        </text>
        <text x={width - PAD} y={30} fontSize={20} fontWeight={800} textAnchor="end" fill="var(--foreground)">
          {title}
        </text>
        <line
          x1={PAD}
          y1={HEADER_H - 14}
          x2={width - PAD}
          y2={HEADER_H - 14}
          stroke="var(--border)"
          strokeWidth={1}
        />

        {/* Edges */}
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

        {graph.nodes.map((n) => (
          <NodeBox key={n.number} n={n} country={country} university={university} />
        ))}

        {/* Legend */}
        {kindsUsed.map((k, i) => {
          const ly = height - LEGEND_H + 26;
          const lx = width - PAD - i * 150;
          return (
            <g key={k}>
              <circle cx={lx} cy={ly} r={5} fill={KIND_COLOR[k]} />
              <text x={lx - 10} y={ly + 4} fontSize={11} textAnchor="end" fill="var(--muted)">
                {KIND_LABEL[k]}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

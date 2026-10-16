import type { StudyPlanCategory, StudyPlanCourse } from "./study-plans";

// Turns a study plan's compulsory college + specialization courses into a
// prerequisite dependency graph (nodes = courses, edges = "requires"), laid
// out into columns by depth (longest prerequisite chain) — the same idea as
// the printed curriculum-flowchart posters Jordanian CS departments hand out,
// rendered live and clickable instead of a static image.
//
// University-wide gen-ed and remedial courses rarely have meaningful
// prerequisite chains worth graphing, so they're returned separately as
// "other" categories for a simpler list view — along with any nominally-
// "core" course that turns out to have no prerequisite edge in either
// direction (typically standalone math/physics service courses that don't
// chain into the major's own course sequence, even though they're formally
// a specialization/college requirement). Specialization electives usually DO
// hang off a compulsory course (e.g. "AI" requires "Data Structures") and
// are graphed too, just in their own color, since that's exactly what makes
// the chart useful for picking an elective.

export type FlowKind = "college" | "specialization" | "elective";

export type FlowNode = {
  number: string;
  name: string;
  labName?: string;
  creditHours: number;
  kind: FlowKind;
  prereqs: string[]; // numbers of other FlowNodes this one depends on
  col: number;
  row: number;
};

export type FlowGraph = {
  nodes: FlowNode[];
  edges: { from: string; to: string }[]; // from prerequisite -> to dependent
  colCount: number;
  rowCount: number;
};

const NUMBER = /\d{6,10}/g;
const SYNCHRONOUS_ONLY = /^(\d{6,10})\s*\(متزامن\)$/;

// Course numbers are sometimes printed with/without a leading zero depending
// on which table column they came from (the official document itself is
// inconsistent here) — treat those as the same course.
function normalize(number: string): string {
  return number.replace(/^0+/, "");
}

function isElective(name: string) {
  return name.includes("اختياري");
}
function isRemedial(name: string) {
  return name.includes("استدراك");
}
function isUniversityGeneral(name: string) {
  return name.includes("الجامعة");
}
function kindOf(categoryName: string): FlowKind | null {
  if (isRemedial(categoryName) || isUniversityGeneral(categoryName)) return null;
  if (isElective(categoryName)) return "elective";
  return categoryName.includes("كلية") ? "college" : "specialization";
}

function splitCategoriesRaw(categories: StudyPlanCategory[]) {
  const core: { course: StudyPlanCourse; kind: FlowKind; categoryName: string }[] = [];
  const other: StudyPlanCategory[] = [];
  for (const cat of categories) {
    const kind = kindOf(cat.name);
    if (kind) {
      for (const course of cat.courses) core.push({ course, kind, categoryName: cat.name });
    } else {
      other.push(cat);
    }
  }
  return { core, other };
}

/** Non-core categories only (electives, remedial, university-wide) — used when no graph is needed. */
export function splitCategories(categories: StudyPlanCategory[]) {
  const { core, other } = splitCategoriesRaw(categories);
  return { core, other };
}

export function buildPrerequisiteGraph(categories: StudyPlanCategory[]): {
  graph: FlowGraph;
  standalone: StudyPlanCategory[]; // core courses with no prerequisite edge either way
} {
  const { core } = splitCategoriesRaw(categories);
  const byNormalized = new Map(core.map((c) => [normalize(c.course.number), c]));

  // Fold synchronous lab/co-requisite courses into the course they pair with
  // ("Intro to Programming" + "Intro to Programming Lab" -> one node).
  const labNameOf = new Map<string, string>(); // parent number (normalized) -> lab name
  const labCreditsOf = new Map<string, number>();
  const merged = new Set<string>(); // course numbers folded away
  const mergedInto = new Map<string, string>(); // lab number (normalized) -> parent key
  for (const { course } of core) {
    const m = course.prerequisite?.trim().match(SYNCHRONOUS_ONLY);
    const parent = m && byNormalized.get(normalize(m[1]));
    if (parent && parent.course.number !== course.number) {
      const parentKey = normalize(parent.course.number);
      labNameOf.set(parentKey, course.name);
      labCreditsOf.set(parentKey, course.creditHours);
      merged.add(course.number);
      mergedInto.set(normalize(course.number), parentKey);
    }
  }

  const nodes = new Map<string, FlowNode>(); // keyed by normalized number
  for (const { course, kind } of core) {
    if (merged.has(course.number)) continue;
    const key = normalize(course.number);
    nodes.set(key, {
      number: course.number,
      name: course.name,
      labName: labNameOf.get(key),
      creditHours: course.creditHours + (labCreditsOf.get(key) ?? 0),
      kind,
      prereqs: [],
      col: 0,
      row: 0,
    });
  }

  const edges: { from: string; to: string }[] = [];
  for (const { course } of core) {
    if (merged.has(course.number)) continue;
    const key = normalize(course.number);
    const node = nodes.get(key);
    if (!node || !course.prerequisite) continue;
    const refs = (course.prerequisite.match(NUMBER) ?? []).map(normalize);
    for (const rawRef of refs) {
      // A reference to a merged lab really means "its lecture course" —
      // redirect rather than drop, or the edge through the lab is lost.
      const ref = mergedInto.get(rawRef) ?? rawRef;
      if (ref !== key && nodes.has(ref) && !node.prereqs.includes(ref)) {
        node.prereqs.push(ref);
        edges.push({ from: ref, to: key });
      }
    }
  }

  // Drop nodes with no edge in either direction — they're formally a
  // college/specialization requirement but don't chain into the major's
  // course sequence, so a flowchart isn't the useful way to show them.
  const hasIncoming = new Set(edges.map((e) => e.to));
  const hasOutgoing = new Set(edges.map((e) => e.from));
  const standaloneCourses: StudyPlanCourse[] = [];
  for (const [key, node] of [...nodes]) {
    if (!hasIncoming.has(key) && !hasOutgoing.has(key)) {
      standaloneCourses.push({
        number: node.number,
        name: node.name,
        creditHours: node.creditHours,
        theoretical: node.creditHours,
        practical: 0,
      });
      nodes.delete(key);
    }
  }

  // Depth = longest chain from a root (no in-set prerequisite).
  const depthCache = new Map<string, number>();
  function depthOf(key: string, guard = new Set<string>()): number {
    if (depthCache.has(key)) return depthCache.get(key)!;
    if (guard.has(key)) return 0; // defensive: break accidental cycles
    const node = nodes.get(key);
    const validPrereqs = node?.prereqs.filter((p) => nodes.has(p)) ?? [];
    if (!node || validPrereqs.length === 0) {
      depthCache.set(key, 0);
      return 0;
    }
    guard.add(key);
    const d = 1 + Math.max(...validPrereqs.map((p) => depthOf(p, guard)));
    depthCache.set(key, d);
    return d;
  }
  for (const [key, node] of nodes) node.col = depthOf(key);

  // Row: order each column by the average row of its prerequisites
  // (barycenter heuristic) to keep chains roughly horizontal and legible.
  const colCount = Math.max(0, ...[...nodes.values()].map((n) => n.col)) + 1;
  const rowsUsed = new Array(colCount).fill(0);
  const byCol: FlowNode[][] = Array.from({ length: colCount }, () => []);
  for (const node of nodes.values()) byCol[node.col].push(node);

  for (let c = 0; c < colCount; c++) {
    const list = byCol[c];
    const withKey = list.map((n, i) => {
      const preds = n.prereqs
        .filter((p) => nodes.has(p))
        .map((p) => nodes.get(p)!.row);
      const avg = preds.length ? preds.reduce((a, b) => a + b, 0) / preds.length : i;
      return { n, avg, i };
    });
    withKey.sort((a, b) => a.avg - b.avg || a.i - b.i);
    withKey.forEach(({ n }, row) => {
      n.row = row;
    });
    rowsUsed[c] = list.length;
  }

  // Edges are built against normalized keys, but FlowNode.number keeps the
  // original (possibly leading-zero) course number — translate back so the
  // renderer can match edges to nodes by their real number.
  const filteredEdges = edges
    .filter((e) => nodes.has(e.from) && nodes.has(e.to))
    .map((e) => ({ from: nodes.get(e.from)!.number, to: nodes.get(e.to)!.number }));

  const standalone: StudyPlanCategory[] =
    standaloneCourses.length > 0
      ? [
          {
            name: "مواد بدون سلسلة متطلبات",
            creditHours: standaloneCourses.reduce((s, c) => s + c.creditHours, 0),
            note: "مواد بعيدة عن مسار المواد الرئيسي — ما إلها متطلب سابق أو لاحق داخل التخصص نفسه.",
            courses: standaloneCourses,
          },
        ]
      : [];

  return {
    graph: {
      nodes: [...nodes.values()],
      edges: filteredEdges,
      colCount,
      rowCount: Math.max(1, ...rowsUsed),
    },
    standalone,
  };
}

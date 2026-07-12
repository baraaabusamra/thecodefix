import fs from "node:fs";
import path from "node:path";

// Original Arabic developer reference (المرجع) — our own data, one template,
// hundreds of long-tail static pages. Each section is a JSON file in
// src/content/reference/<section>.json containing an array of entries.
// (Deliberately NOT scraped/translated from MDN — every entry is written by
// us; MDN is linked as an external authoritative source only.)

const REF_DIR = path.join(process.cwd(), "src", "content", "reference");

export type RefAttribute = { name: string; desc: string };

export type RefEntry = {
  slug: string; // URL segment, e.g. "a", "img"
  name: string; // display token, e.g. "<a>"
  title: string; // Arabic headline, e.g. "وسم الروابط"
  category: string; // grouping on the section index
  summary: string; // 1-2 sentences (also the meta description)
  description: string; // paragraphs separated by \n\n
  syntax: string; // canonical usage snippet
  example: string; // runnable snippet for the interactive playground
  attributes?: RefAttribute[];
  tips?: string[];
  mistakes?: string[];
  related?: string[]; // slugs within the same section
  mdn?: string; // external source link
  keywords?: string[];
};

export type RefSection = {
  slug: string;
  title: string; // "مرجع وسوم HTML"
  entityLabel: string; // "وسم" / "خاصية"
  icon: string;
  intro: string;
  track: string; // related /learn track slug
  playgroundMode: "html" | "js";
  attributesTitle: string; // heading of the attributes/values table
  attributesHeader: string; // first column header
};

export const REF_SECTIONS: RefSection[] = [
  {
    slug: "html",
    title: "مرجع وسوم HTML",
    entityLabel: "وسم",
    icon: "🏗️",
    intro:
      "كل وسم بالعربي: ماذا يفعل، صياغته، خصائصه المهمة، مثال تجرّبه في المتصفح مباشرة، وأشهر الأخطاء.",
    track: "html",
    playgroundMode: "html",
    attributesTitle: "أهم الخصائص",
    attributesHeader: "الخاصية",
  },
  {
    slug: "css",
    title: "مرجع خصائص CSS",
    entityLabel: "خاصية",
    icon: "🎨",
    intro:
      "كل خاصية بالعربي: ماذا تفعل، قيمها المهمة، مثال حي تعدّله وترى نتيجته فورًا، وأشهر أخطاء استخدامها.",
    track: "css",
    playgroundMode: "html",
    attributesTitle: "أهم القيم",
    attributesHeader: "القيمة",
  },
];

export function getRefSection(slug: string): RefSection | null {
  return REF_SECTIONS.find((s) => s.slug === slug) ?? null;
}

export function getRefEntries(section: string): RefEntry[] {
  const file = path.join(REF_DIR, `${section}.json`);
  if (!fs.existsSync(file)) return [];
  const entries = JSON.parse(fs.readFileSync(file, "utf-8")) as RefEntry[];
  // Stable order: by category (file order preserved within category).
  return entries;
}

export function getRefEntry(section: string, slug: string): RefEntry | null {
  return getRefEntries(section).find((e) => e.slug === slug) ?? null;
}

/** Categories in file order (insertion order preserved). */
export function getRefCategories(entries: RefEntry[]): string[] {
  return [...new Set(entries.map((e) => e.category))];
}

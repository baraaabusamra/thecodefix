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
  // "none" = compiled/no in-browser runtime (e.g. C++) — render a static
  // code block instead of the interactive Playground.
  playgroundMode: "html" | "js" | "none";
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
  {
    slug: "cpp",
    title: "مرجع C++",
    entityLabel: "عنصر",
    icon: "➕",
    intro:
      "كل كلمة مفتاحية وحاوية ودالة قياسية في C++ بالعربي: ماذا تفعل، صياغتها، مثال يوضّحها، وأشهر الأخطاء — لغة مُترجَمة فلا يوجد تشغيل حي في المتصفح.",
    track: "cpp",
    playgroundMode: "none",
    attributesTitle: "أهم النقاط",
    attributesHeader: "العنصر",
  },
  {
    slug: "javascript",
    title: "مرجع دوال JavaScript",
    entityLabel: "دالة",
    icon: "🟨",
    intro:
      "كل دالة قياسية بالعربي: ماذا تفعل، صياغتها، مثال حي تعدّله وترى نتيجته فورًا، وأشهر الأخطاء.",
    track: "javascript",
    playgroundMode: "js",
    attributesTitle: "أهم المعاملات",
    attributesHeader: "المعامل",
  },
  {
    slug: "flutter",
    title: "مرجع ويدجتس Flutter",
    entityLabel: "ويدجت",
    icon: "💙",
    intro:
      "كل ويدجت بالعربي: ماذا يفعل، أهم معاملاته، مثال يوضّحه، وأشهر الأخطاء — Dart لغة مُترجَمة فلا يوجد تشغيل حي في المتصفح.",
    track: "flutter",
    playgroundMode: "none",
    attributesTitle: "أهم المعاملات",
    attributesHeader: "المعامل",
  },
  {
    slug: "django",
    title: "مرجع استعلامات Django ORM",
    entityLabel: "دالة",
    icon: "🐍",
    intro:
      "كل دالة QuerySet بالعربي: ماذا تفعل، صياغتها، مثال يوضّحها، وأشهر الأخطاء — Python لغة مُترجَمة فلا يوجد تشغيل حي في المتصفح.",
    track: "django",
    playgroundMode: "none",
    attributesTitle: "أهم المعاملات",
    attributesHeader: "المعامل",
  },
  {
    slug: "dsa",
    title: "مرجع الخوارزميات وتعقيدها",
    entityLabel: "خوارزمية",
    icon: "🧮",
    intro:
      "كل خوارزمية ترتيب وبحث وفئة تعقيد بالعربي: كيف تعمل، مثال كود، وتعقيدها الزمني — مرجع سريع للمقابلات التقنية.",
    track: "dsa",
    playgroundMode: "none",
    attributesTitle: "أهم النقاط",
    attributesHeader: "النقطة",
  },
  {
    slug: "java",
    title: "مرجع Java",
    entityLabel: "عنصر",
    icon: "☕",
    intro:
      "كل كلمة مفتاحية وصنف ودالة قياسية في Java بالعربي: ماذا تفعل، صياغتها، مثال يوضّحها، وأشهر الأخطاء — لغة مُترجَمة فلا يوجد تشغيل حي في المتصفح.",
    track: "java",
    playgroundMode: "none",
    attributesTitle: "أهم النقاط",
    attributesHeader: "العنصر",
  },
  {
    slug: "cybersecurity",
    title: "مرجع مفاهيم الأمن السيبراني",
    entityLabel: "مفهوم",
    icon: "🛡️",
    intro:
      "كل ثغرة ومفهوم دفاعي بالعربي: كيف تحدث مفهوميًّا، ومثال كود دفاعي يمنعها، وأشهر الأخطاء — محتوى تعليمي دفاعي بحت، لا خطوات استغلال.",
    track: "cybersecurity",
    playgroundMode: "none",
    attributesTitle: "أهم النقاط",
    attributesHeader: "النقطة",
  },
  {
    slug: "api-security",
    title: "مرجع أمن API",
    entityLabel: "مفهوم",
    icon: "🔐",
    intro:
      "كل ثغرة ومبدأ أمني بالعربي: ماذا تعني، كيف تُستغل، مثال هجوم وإصلاح، وأشهر الأخطاء — مبني على OWASP API Security Top 10 (2023) ومبادئ الأمن الأساسية.",
    track: "api-security",
    playgroundMode: "none",
    attributesTitle: "أهم النقاط",
    attributesHeader: "النقطة",
  },
  {
    slug: "c",
    title: "مرجع لغة C",
    entityLabel: "عنصر",
    icon: "🇨",
    intro:
      "كل كلمة مفتاحية ودالة قياسية في لغة C بالعربي: ماذا تفعل، صياغتها، مثال يوضّحها، وأشهر الأخطاء — لغة مُترجَمة فلا يوجد تشغيل حي في المتصفح.",
    track: "c",
    playgroundMode: "none",
    attributesTitle: "أهم النقاط",
    attributesHeader: "العنصر",
  },
  {
    slug: "go",
    title: "مرجع Go",
    entityLabel: "عنصر",
    icon: "🐹",
    intro:
      "كل كلمة مفتاحية ودالة مدمجة ودالة قياسية في Go بالعربي: ماذا تفعل، صياغتها، مثال يوضّحها، وأشهر الأخطاء — لغة مُترجَمة فلا يوجد تشغيل حي في المتصفح.",
    track: "go",
    playgroundMode: "none",
    attributesTitle: "أهم النقاط",
    attributesHeader: "العنصر",
  },
  {
    slug: "devops",
    title: "مرجع DevOps و CI/CD",
    entityLabel: "عنصر",
    icon: "🚀",
    intro:
      "أهم عناصر DevOps وCI/CD بالعربي: مفاتيح GitHub Actions، استراتيجيات النشر، أوامر kubectl وTerraform — ماذا يفعل كل عنصر، صياغته، مثال يوضّحه، وأشهر الأخطاء.",
    track: "devops",
    playgroundMode: "none",
    attributesTitle: "أهم النقاط",
    attributesHeader: "العنصر",
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

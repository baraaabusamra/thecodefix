import fs from "node:fs";
import path from "node:path";
import { dataDir } from "@tcf/content/paths";

const DIR = dataDir("academic-universities");

// Standard IT/CS specializations commonly offered across Arab universities'
// computing colleges — real category names (verified), not a claim that any
// specific university's exact curriculum matches this list. Shared/generic
// on purpose: precisely verifying every university's own course catalog
// isn't something we can responsibly claim to have done.
export type Specialization = {
  slug: string;
  title: string;
  description: string;
  courseSlugs: string[]; // slugs from src/content/academic/*.json
};

export const SPECIALIZATIONS: Specialization[] = [
  {
    slug: "computer-science",
    title: "علوم الحاسوب",
    description: "التخصص الأشمل — أساسيات البرمجة، هياكل البيانات، قواعد البيانات، والشبكات.",
    courseSlugs: [
      "intro-to-programming",
      "data-structures-algorithms",
      "database-systems",
      "computer-networks",
      "software-engineering",
    ],
  },
  {
    slug: "software-engineering",
    title: "هندسة البرمجيات",
    description: "التركيز على تصميم وبناء أنظمة برمجية كبيرة ضمن فريق.",
    courseSlugs: [
      "intro-to-programming",
      "software-engineering",
      "data-structures-algorithms",
      "database-systems",
    ],
  },
  {
    slug: "information-technology",
    title: "تقنية / نظم المعلومات",
    description: "التركيز على الأنظمة والبنية التحتية وتطبيقات الويب داخل المؤسسات.",
    courseSlugs: [
      "intro-to-programming",
      "database-systems",
      "computer-networks",
      "web-development",
    ],
  },
  {
    slug: "cybersecurity",
    title: "الأمن السيبراني",
    description: "التركيز على حماية الأنظمة والشبكات والبيانات.",
    courseSlugs: [
      "intro-to-programming",
      "computer-networks",
      "information-security",
      "database-systems",
    ],
  },
  {
    slug: "artificial-intelligence",
    title: "الذكاء الاصطناعي",
    description: "التركيز على تعلّم الآلة والخوارزميات الذكية ومعالجة البيانات الضخمة.",
    courseSlugs: [
      "intro-to-programming",
      "data-structures-algorithms",
      "database-systems",
    ],
  },
  {
    slug: "computer-information-systems",
    title: "أنظمة المعلومات الحاسوبية",
    description: "التركيز على تصميم وتحليل نظم المعلومات لاحتياجات المؤسسات.",
    courseSlugs: [
      "intro-to-programming",
      "database-systems",
      "web-development",
    ],
  },
  {
    slug: "business-information-technology",
    title: "تكنولوجيا معلومات الأعمال",
    description: "التركيز على تطبيق تقنية المعلومات لحلّ مشكلات الأعمال والإدارة.",
    courseSlugs: [
      "intro-to-programming",
      "database-systems",
      "web-development",
    ],
  },
  {
    slug: "data-science",
    title: "علم البيانات",
    description: "التركيز على تحليل البيانات الضخمة واستخراج المعرفة منها.",
    courseSlugs: [
      "intro-to-programming",
      "data-structures-algorithms",
      "database-systems",
    ],
  },
];

export function getSpecialization(slug: string): Specialization | null {
  return SPECIALIZATIONS.find((s) => s.slug === slug) ?? null;
}

export type University = {
  slug: string;
  name: string;
  city?: string;
  specializations: string[]; // Specialization.slug values this university offers
};

export function getUniversities(country: string): University[] {
  const file = path.join(DIR, `${country}.json`);
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8")) as University[];
}

export function getUniversity(country: string, slug: string): University | null {
  return getUniversities(country).find((u) => u.slug === slug) ?? null;
}

// Countries with real, populated university data — used to decide which
// /academic/<country> pages actually build and which show "قريبًا".
export function hasAcademicData(country: string): boolean {
  return fs.existsSync(path.join(DIR, `${country}.json`));
}

export function getAcademicCountrySlugs(): string[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""));
}

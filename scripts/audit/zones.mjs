// scripts/audit/zones.mjs
// 📍 خريطة: منطقة "مختبر الجودة" ← تعريف مناطق خريطة المول (V2)
//
// Every workspace package in scripts/v2/layout.mjs is a zone on the map, plus
// the content tree, the quality lab, the docs library and the entrance
// (root config). A file lands in the FIRST zone whose match() is true.
// Adding a package to layout.mjs adds it to the map automatically; give it a
// look (emoji, color, floor position) in LOOK below.

import { PACKAGES } from "../v2/layout.mjs";

/** Presentation per zone: emoji, color, and the floor-plan area it occupies. */
const LOOK = {
  "@tcf/web": { emoji: "🏛️", color: "#0ea5e9", name: "الساحة المركزية — الموقع (apps/web)" },
  "@tcf/learning": { emoji: "🎓", color: "#16a34a" },
  "@tcf/progress": { emoji: "📈", color: "#22c55e" },
  "@tcf/assessment": { emoji: "📝", color: "#84cc16" },
  "@tcf/certificates": { emoji: "🏅", color: "#ca8a04" },
  "@tcf/billing": { emoji: "💳", color: "#dc2626" },
  "@tcf/creators": { emoji: "🎨", color: "#db2777" },
  "@tcf/academic": { emoji: "🏫", color: "#9333ea" },
  "@tcf/jobs": { emoji: "💼", color: "#d97706" },
  "@tcf/feedback": { emoji: "💬", color: "#f472b6" },
  "@tcf/media": { emoji: "🎬", color: "#e11d48" },
  "@tcf/admin": { emoji: "🛠️", color: "#7c3aed" },
  "@tcf/core": { emoji: "🧱", color: "#475569" },
  "@tcf/db": { emoji: "🗄️", color: "#0f766e" },
  "@tcf/identity": { emoji: "🔐", color: "#b91c1c" },
  "@tcf/content": { emoji: "⚙️", color: "#15803d", name: "محرّك المحتوى (@tcf/content)" },
  "@tcf/observability": { emoji: "📡", color: "#0369a1" },
  "@tcf/ui": { emoji: "🧩", color: "#0891b2" },
  "@tcf/contracts": { emoji: "📜", color: "#4f46e5" },
};

const pkgZones = Object.entries(PACKAGES).map(([name, info]) => {
  const look = LOOK[name] ?? { emoji: "📦", color: "#64748b" };
  const short = name.replace("@tcf/", "");
  return {
    id: short,
    pkg: name,
    role: info.role,
    emoji: look.emoji,
    color: look.color,
    name: look.name ?? `${info.desc.split("،")[0]} (${name})`,
    desc: `${info.role === "foundation" ? "حزمة أساس" : info.role === "module" ? "وحدة ميزة" : "تطبيق"} · ${info.desc}`,
    match: (f) => f === info.dir || f.startsWith(info.dir + "/"),
    shop: (f) => shopFor(info, f),
  };
});

function shopFor(info, f) {
  const rel = f.slice(info.dir.length + 1);
  if (info.role === "app") {
    if (rel.startsWith("src/app/")) {
      const seg = rel.split("/")[2] ?? "";
      if (!seg || /\.(tsx?|css|ico|png)$/.test(seg)) return `${info.dir}/src/app (root)`;
      return `${info.dir}/src/app/${seg}`;
    }
    if (rel.startsWith("src/")) return `${info.dir}/src/${rel.split("/")[1]}`.replace(/\.(tsx?)$/, "");
    return `${info.dir} (config)`;
  }
  if (!rel.startsWith("src/")) return rel.startsWith("drizzle/") ? `${info.dir}/drizzle` : `${info.dir} (package)`;
  const parts = rel.split("/");
  return parts.length > 2 ? `${info.dir}/src/${parts[1]}` : `${info.dir}/src`;
}

export const ZONES = [
  {
    id: "config", emoji: "🚪", color: "#64748b", name: "المدخل — إعدادات المستودع", role: "infra",
    desc: "package.json الجذري (workspaces)، turbo.json، tsconfig، ESLint، CI. من هون بيبلش كل إشي.",
    match: (f) => (!f.includes("/") && !/\.(md|pdf)$/.test(f)) || f.startsWith(".github/"),
    shop: (f) => (f.startsWith(".github/") ? ".github" : "(root)"),
  },
  ...pkgZones,
  {
    id: "content-tree", emoji: "📚", color: "#16a34a", name: "مستودع المحتوى (content/)", role: "data",
    desc: "الدروس والمقالات والمرجع والاختبارات لكل لغة (content/ar، content/en لاحقًا)، والبيانات المحايدة لغويًا (content/data). كل محل = مسار أو نوع محتوى.",
    match: (f) => f.startsWith("content/"),
    shop: (f) => {
      const p = f.split("/");
      if (p[1] === "ar" && p[2] === "tracks") return p.slice(0, 4).join("/");
      return p.length > 3 ? p.slice(0, 3).join("/") : p.slice(0, 2).join("/");
    },
  },
  {
    id: "quality", emoji: "🧪", color: "#2563eb", name: "مختبر الجودة — السكربتات والاختبارات", role: "infra",
    desc: "فحوصات المحتوى وSEO (check:*)، الاختبارات، أدوات الخريطة والفحص (scripts/audit)، أدوات الانتقال لـ V2 (scripts/v2).",
    match: (f) => f.startsWith("scripts/") || f.startsWith("tests/") || f === "run-ci.cmd",
    shop: (f) => (/^scripts\/(audit|v2|ci|lib)\//.test(f) ? f.split("/").slice(0, 2).join("/") : f.startsWith("tests/helpers/") ? "tests/helpers" : f.split("/")[0]),
  },
  {
    id: "docs", emoji: "📖", color: "#78716c", name: "المكتبة — التوثيق والقواعد", role: "infra",
    desc: "معمارية V2 وقراراتها (docs/v2)، سياسات المحتوى وSEO، قواعد Cursor، أوامر وskills الوكلاء.",
    match: (f) => /^(docs|rules|\.claude)\//.test(f) || (!f.includes("/") && /\.(md|pdf)$/.test(f)),
    shop: (f) => (f.includes("/") ? f.split("/").slice(0, -1).slice(0, 2).join("/") : "(root docs)"),
  },
  {
    id: "archive", emoji: "🗃️", color: "#a8a29e", name: "الأرشيف", role: "infra",
    desc: "كود V1 غير مستخدم محفوظ للمراجعة (غير مُترجم).",
    match: (f) => f.startsWith("archive/") || f.startsWith("screenshot/"),
    shop: (f) => f.split("/").slice(0, 2).join("/"),
  },
  { id: "other", emoji: "❔", color: "#d4d4d8", name: "متفرقات", role: "infra", desc: "ملفات بلا منطقة واضحة.", match: () => true, shop: (f) => f.split("/")[0] },
];

/** Floor plan of the mall, top to bottom. Each inner array is one row. */
export const FLOOR = [
  ["content-tree", "learning", "assessment", "progress"],
  ["content-tree", "certificates", "media", "creators"],
  ["web", "web", "academic", "jobs"],
  ["web", "web", "billing", "feedback"],
  ["admin", "admin", "quality", "docs"],
  ["content", "db", "identity", "core"],
  ["ui", "observability", "contracts", "archive"],
  ["config", "config", "config", "config"],
];

export const FOLDER_NOTES = {
  "(root)": { name: "جذر المستودع", note: "package.json (workspaces)، turbo.json، tsconfig.base/tsconfig، eslint" },
  ".github": { note: "GitHub Actions: CI على كل push وPR" },
  "apps/web/src/app (root)": { name: "إطار الموقع", note: "layout.tsx، الصفحة الرئيسية، sitemap، robots، صفحات الخطأ" },
  "apps/web/src/app/learn": { name: "المسارات والدروس", note: "/learn ← /learn/[tech] ← /learn/[tech]/[lesson]" },
  "apps/web/src/app/api": { name: "واجهات API", note: "auth، checkout، stripe webhook، csp-report، و/api/v1 للموبايل" },
  "apps/web/src/app/admin": { name: "صفحات الإدارة", note: "كل صفحة تفحص صلاحيتها بنفسها" },
  "apps/web/src/shell": { name: "هيكل الموقع", note: "الهيدر، الفوتر، القوائم، لوحة الأوامر" },
  "apps/web/src/server": { name: "منطق السيرفر الخاص بالموقع", note: "طبقة /api/v1" },
  "packages/db/drizzle": { name: "الترحيلات", note: "30 ملف SQL مقفلة — لا تعدّل القديم أبدًا" },
  "packages/db/src/schema": { name: "الـ Schema حسب المجال", note: "11 ملف، بدون أي تغيير SQL عن V1" },
  "content/ar/blog": { name: "مقالات المدونة", note: "103 مقال MDX" },
  "content/ar/reference": { name: "المرجع", note: "قسم JSON لكل تقنية" },
  "content/ar/quiz-bank": { name: "بنك أسئلة الامتحانات", note: "سري — لا يصل للمتصفح أبدًا" },
  "content/data/academic-universities": { name: "الجامعات" },
  "content/_drafts/wave-1": { name: "مسودات الموجة 1", note: "غير منشورة" },
  "scripts/audit": { name: "أدوات الخريطة والفحص", note: "scan-code / scan-security / scan-content / scan-branches / build-map / where" },
  "scripts/v2": { name: "أدوات V2", note: "layout (خريطة الانتقال)، restructure، mv، workspaces، port-branch، new-module" },
  tests: { name: "الاختبارات", note: "node --test عبر tsx (Node 24)" },
  "docs/v2": { name: "معمارية V2", note: "ARCHITECTURE.md، قرارات ADR، دليل الانتقال" },
  "docs/project-map": { name: "خريطة المشروع", note: "MAP.md + الصفحة التفاعلية" },
};

/** Fallback notes by the folder's last segment, so every shop says what it holds. */
export const GENERIC_NOTES = {
  ui: "مكونات الواجهة (React) — تُستورد كـ @tcf/<الحزمة>/ui/<الاسم>",
  actions: "Server Actions — نقاط HTTP عامة؛ كل واحدة تفحص الهوية والصلاحية بنفسها",
  admin: "استعلامات وأدوات لوحة الإدارة لهذه الوحدة",
  pipeline: "خط استخراج المناهج: اكتشاف ← جمع ← استخراج ← طابور مراجعة بشرية",
  providers: "مزوّدات قابلة للتبديل خلف واجهة واحدة",
  schema: "تعريفات الجداول حسب المجال",
  src: "منطق الحزمة (سيرفر ومشترك)",
  "(package)": "package.json · README · MAP.svg",
  "(config)": "next.config · tsconfig · postcss · package.json",
  types: "تعريفات أنواع عامة (ambient)",
  shell: "هيكل الموقع: الهيدر، الفوتر، القوائم",
  server: "منطق سيرفر خاص بالموقع",
};

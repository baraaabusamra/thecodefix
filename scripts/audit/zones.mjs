// scripts/audit/zones.mjs
// 📍 خريطة: منطقة "أدوات الفحص" ← تعريف مناطق الخريطة
// The map's "mall districts". Each file lands in the FIRST zone whose
// match() returns true, so order matters (specific before general).
// When V2 moves folders around, update the matchers here and re-run
// `node scripts/audit/run-all.mjs` — the map and MAP.md follow.

const app = (...dirs) => (f) => dirs.some((d) => f === `src/app/${d}` || f.startsWith(`src/app/${d}/`));

export const ZONES = [
  {
    id: "config", emoji: "🚪", name: "المدخل — الإعدادات", color: "#64748b",
    desc: "ملفات الإعداد بجذر المشروع: الحزم، Next.js، TypeScript، ESLint، Drizzle، ومتغيرات البيئة النموذجية. من هون بيبلش كل إشي.",
    match: (f) => !f.includes("/") && !/\.(md|cmd|pdf)$/.test(f) || f.startsWith(".github/") || f === ".nvmrc",
    shop: (f) => (f.startsWith(".github/") ? ".github" : "(root)"),
  },
  {
    id: "core", emoji: "🏛️", name: "الساحة المركزية — هيكل الموقع", color: "#0ea5e9",
    desc: "الإطار اللي بيلف كل الصفحات: layout، الصفحة الرئيسية، sitemap وrobots، صفحات الخطأ، والصفحات الثابتة (من نحن، تواصل، الخصوصية، الشروط).",
    match: (f) => /^src\/app\/[^/]+\.(tsx?|css|ico|png)$/.test(f) && !/actions\.ts$/.test(f) || app("about", "contact", "privacy", "terms")(f) || /^src\/(instrumentation|middleware|proxy)\.ts$/.test(f) || f.startsWith("src/types/"),
    shop: (f) => (f.startsWith("src/app/") && f.split("/").length > 3 ? f.split("/").slice(0, 3).join("/") : f.startsWith("src/types/") ? "src/types" : "src/app (root)"),
  },
  {
    id: "learning", emoji: "🎓", name: "منطقة التعلّم", color: "#22c55e",
    desc: "قلب الموقع للطالب: المسارات والدروس، الاختبارات والامتحانات، الشهادات والتحقق منها، الملعب (Playground)، لوحة المتصدرين، خرائط الطريق، المرجع، والبحث.",
    match: (f) => app("learn", "quiz", "certificate", "verify", "playground", "leaderboard", "roadmaps", "reference", "search")(f) || /^src\/app\/(progress|suggest)-actions\.ts$/.test(f) || f.startsWith("src/app/api/cert-og/"),
    shop: (f) => f.split("/").slice(0, 3).join("/").replace(/-actions\.ts$/, "-actions"),
  },
  { id: "blog", emoji: "📰", name: "المدونة", color: "#f97316", desc: "صفحات قائمة المقالات وصفحة المقال الواحد (المحتوى نفسه بمستودع المحتوى).", match: app("blog"), shop: () => "src/app/blog" },
  { id: "academic", emoji: "🏫", name: "الأكاديمي — الجامعات", color: "#a855f7", desc: "دول ← جامعات ← تخصصات ← خطط دراسية ومواد. كيان فرعي مستقل عن المسارات (seo-technical-policy §16).", match: app("academic"), shop: () => "src/app/academic" },
  { id: "jobs", emoji: "💼", name: "الوظائف والتدريب", color: "#eab308", desc: "صفحات الوظائف حسب الدولة (من Jooble) والتدريب، وتنبيهات الوظائف بالإيميل.", match: app("jobs", "training"), shop: (f) => f.split("/").slice(0, 3).join("/") },
  {
    id: "creators", emoji: "🎨", name: "منشئو المحتوى", color: "#ec4899",
    desc: "مركز صنّاع المحتوى: التسجيل، لوحة التحكم، إرسال المنشورات ومراجعتها، المعرض، وصفحات المنشئين العامة.",
    match: (f) => app("creators")(f) || f.startsWith("src/components/creators/") || f.startsWith("src/app/api/creators/"),
    shop: (f) => (f.startsWith("src/components/") ? "src/components/creators" : f.startsWith("src/app/api/") ? "src/app/api/creators" : f.split("/").slice(0, 4).join("/").replace(/\/[^/]*\.tsx?$/, "")),
  },
  {
    id: "accounts", emoji: "🔐", name: "الحسابات والدفع", color: "#ef4444",
    desc: "تسجيل الدخول (NextAuth)، صفحة الحساب، الأسعار، الدفع عبر Stripe والـ webhook، والإشعارات.",
    match: (f) => app("account", "login", "pricing", "api/auth", "api/checkout", "api/stripe", "api/notifications")(f) || f === "src/auth.ts",
    shop: (f) => (f === "src/auth.ts" ? "src/auth.ts" : f.split("/").slice(0, f.includes("/api/") ? 4 : 3).join("/")),
  },
  { id: "admin", emoji: "🛠️", name: "لوحة الإدارة", color: "#7c3aed", desc: "كل شاشات الإدارة: المحتوى، الاختبارات، المستخدمين، المنشئين، العمليات، الوظائف، SEO، التقارير، الفواتير. كل Server Action هون لازم يفحص الصلاحية.", match: app("admin"), shop: (f) => f.split("/").slice(0, 4).join("/").replace(/\/[^/]*\.tsx?$/, "") || "src/app/admin" },
  { id: "api", emoji: "🔌", name: "خدمات API أخرى", color: "#14b8a6", desc: "نقاط API عامة للمراقبة وتقارير CSP.", match: app("api"), shop: (f) => f.split("/").slice(0, 4).join("/") },
  { id: "components", emoji: "🧩", name: "ورشة المكونات", color: "#06b6d4", desc: "مكونات React المشتركة: الهيدر، عرض الدروس (Mdx)، الملعب، الاختبارات، البطاقات، الشهادات…", match: (f) => f.startsWith("src/components/"), shop: (f) => f.split("/").slice(0, 3).join("/").replace(/\/[^/]*\.tsx?$/, "") || "src/components" },
  { id: "pipeline", emoji: "🏭", name: "خط استخراج المناهج", color: "#d97706", desc: "بيجمع خطط الجامعات من مصادر خارجية (Tavily/PDF)، بيستخرج المواد، وبيحطها بطابور مراجعة بشرية قبل النشر (factual-data-governance.md).", match: (f) => f.startsWith("src/lib/curriculum/"), shop: (f) => f.split("/").slice(0, 4).join("/").replace(/\/[^/]*\.ts$/, "") },
  { id: "lib", emoji: "⚙️", name: "غرفة المحرّك — المكتبات", color: "#475569", desc: "منطق السيرفر: قراءة المحتوى، الصلاحيات (RBAC)، التقدّم والنقاط، الاختبارات، SEO، Stripe، التشفير، الـ rate limit، والمراقبة.", match: (f) => f.startsWith("src/lib/"), shop: (f) => groupLib(f) },
  { id: "data", emoji: "🗄️", name: "قبو البيانات", color: "#0f766e", desc: "اتصال قاعدة البيانات (Neon + Drizzle)، الـ schema، وملفات الترحيل (migrations) المقفلة.", match: (f) => f.startsWith("src/db/") || f.startsWith("drizzle/"), shop: (f) => (f.startsWith("drizzle/meta") ? "drizzle/meta" : f.startsWith("drizzle/") ? "drizzle" : "src/db") },
  {
    id: "content", emoji: "📚", name: "مستودع المحتوى", color: "#16a34a",
    desc: "الدروس (MDX) لكل مسار، مقالات المدونة، المرجع، الاختبارات وبنك الأسئلة، خرائط الطريق، وبيانات الجامعات. كل محل هون = مسار أو نوع محتوى.",
    match: (f) => f.startsWith("src/content/") || f.startsWith("content/"),
    shop: (f) => (f.startsWith("src/content/tracks/") ? f.split("/").slice(0, 4).join("/") : f.startsWith("content/") ? f.split("/").slice(0, 2).join("/") : f.split("/").length > 3 ? f.split("/").slice(0, 3).join("/") : "src/content (root)"),
  },
  { id: "quality", emoji: "🧪", name: "مختبر الجودة", color: "#2563eb", desc: "سكربتات الفحص (check:*)، الاختبارات، وأدوات الفحص الجديدة (scripts/audit). هاي اللي بتمنع الأخطاء توصل للموقع.", match: (f) => f.startsWith("scripts/") || f.startsWith("tests/") || f === "run-ci.cmd", shop: (f) => (f.startsWith("scripts/audit/") ? "scripts/audit" : f.split("/").slice(0, 1).join("/") || f) },
  { id: "docs", emoji: "📖", name: "المكتبة — التوثيق والقواعد", color: "#78716c", desc: "توثيق المشروع، سياسات المحتوى وSEO، قواعد Cursor، أوامر وskills الوكلاء.", match: (f) => /^(docs|rules|\.claude)\//.test(f) || (!f.includes("/") && /\.(md|pdf)$/.test(f)), shop: (f) => (f.includes("/") ? f.split("/").slice(0, -1).slice(0, 2).join("/") : "(root docs)") },
  { id: "assets", emoji: "🖼️", name: "المخزن — ملفات عامة", color: "#9ca3af", desc: "صور وملفات بتنخدم مباشرة (public/)، الشعار، وعامل Python (py-worker.js) للملعب.", match: (f) => /^(public|assets)\//.test(f), shop: (f) => f.split("/")[0] },
  { id: "other", emoji: "❔", name: "متفرقات", color: "#d4d4d8", desc: "ملفات ما إلها منطقة واضحة — مرشّحة للترتيب بـ v2.", match: () => true, shop: (f) => f.split("/")[0] },
];

function groupLib(f) {
  const b = f.split("/").pop().replace(/\.(ts|tsx)$/, "");
  if (/^admin-/.test(b) || b === "rbac") return "src/lib · إدارة وصلاحيات";
  if (/^academic/.test(b)) return "src/lib · أكاديمي";
  if (/quiz|exam|certificate/.test(b)) return "src/lib · اختبارات وشهادات";
  if (/progress|points|achievement|leaderboard|bookmark|recent|required-lessons|trusted-stats/.test(b)) return "src/lib · تقدّم ونقاط";
  if (/content|blog|reference|roadmap|track|prerequisite|search-index|mdx|changelog/.test(b)) return "src/lib · قراءة المحتوى";
  if (/seo|site|analytics/.test(b)) return "src/lib · SEO وتحليلات";
  if (/stripe|flags/.test(b)) return "src/lib · دفع وميزات";
  if (/creator/.test(b)) return "src/lib · منشئو المحتوى";
  if (/job|jooble/.test(b)) return "src/lib · وظائف";
  if (/crypto|rate-limit|csp|request-body|validation|python-sandbox|db-errors|monitoring|client-monitoring/.test(b)) return "src/lib · أمان ومراقبة";
  return "src/lib · متفرقات";
}

export const FOLDER_NOTES = {
  "(root)": { name: "جذر المشروع", note: "package.json، next.config.ts، tsconfig، eslint، drizzle.config" },
  ".github": { note: "GitHub Actions: CI على كل push وPR لـ main" },
  "src/app (root)": { name: "إطار التطبيق", note: "layout.tsx (الهيكل العام)، page.tsx (الرئيسية)، sitemap، robots، صفحات الخطأ" },
  "src/app/learn": { name: "المسارات والدروس", note: "/learn ← /learn/[tech] ← /learn/[tech]/[lesson]" },
  "src/app/quiz": { name: "الاختبارات", note: "/quiz/[tech] + exam-actions (تصحيح على السيرفر)" },
  "src/app/certificate": { name: "الشهادات", note: "إصدار الشهادة بعد امتحان مصحّح على السيرفر" },
  "src/app/verify": { name: "التحقق من الشهادة", note: "/verify/[certificateId] — صفحة عامة" },
  "src/app/playground": { name: "الملعب", note: "محرر Monaco + تشغيل Python بالمتصفح" },
  "src/app/leaderboard": { name: "المتصدرين" },
  "src/app/roadmaps": { name: "خرائط الطريق" },
  "src/app/reference": { name: "المرجع", note: "/reference/[section]/[slug]" },
  "src/app/search": { name: "البحث", note: "noindex + follow (seo-technical-policy §11)" },
  "src/app/admin": { name: "الإدارة (جذر)", note: "صفحة الدخول، actions.ts (مفتاح الإدارة)" },
  "src/components": { name: "مكونات مشتركة" },
  "src/db": { name: "قاعدة البيانات", note: "index.ts (الاتصال) + schema.ts (كل الجداول)" },
  drizzle: { name: "الترحيلات", note: "30 ملف SQL مقفلة بـ lock — لا تعدّل القديم" },
  "drizzle/meta": { name: "سجل الترحيلات" },
  "src/content/blog": { name: "مقالات المدونة", note: "103 مقال MDX" },
  "src/content/reference": { name: "المرجع", note: "قسم JSON لكل تقنية" },
  "src/content/quizzes": { name: "اختبارات الدروس" },
  "src/content/quiz-bank": { name: "بنك أسئلة الامتحانات" },
  "src/content/roadmaps": { name: "خرائط الطريق" },
  "src/content/academic-universities": { name: "الجامعات" },
  "src/content/academic-study-plans": { name: "الخطط الدراسية" },
  "content/wave-1-drafts": { name: "مسودات الموجة 1", note: "مسودات خارج src — مش منشورة" },
  "content/data": { name: "بيانات خطة المحتوى" },
  scripts: { name: "سكربتات CI والأدوات", note: "check:* + ترحيل + أدوات إدارية" },
  "scripts/audit": { name: "أدوات الفحص والخريطة", note: "scan-code / scan-security / scan-content / scan-branches / build-map" },
  tests: { name: "الاختبارات", note: "node --test (يتطلب Node 24)" },
  "docs/project-map": { name: "خريطة المشروع", note: "MAP.md + الصفحة التفاعلية" },
  rules: { name: "قواعد Cursor", note: "257 ملف .mdc" },
  ".claude/commands": { name: "أوامر الوكيل" },
  ".claude/skills": { name: "Skills" },
  public: { name: "ملفات عامة", note: "الشعار، py-worker.js، ملف تحقق Google" },
};

// scripts/v2/layout.mjs
// 📍 خريطة: منطقة "مختبر الجودة" ← خريطة الانتقال من V1 إلى V2
//
// The single source of truth for "where did this V1 file go in V2?".
// Used by:
//   - scripts/v2/restructure.mjs   (the one-time move + import rewrite)
//   - scripts/v2/port-branch.mjs   (re-path an old V1 branch onto V2)
//   - docs/v2/MIGRATION.md         (generated table, so humans can look it up)
//
// Rules are checked in order; the first match wins. A rule is either an exact
// file ("src/lib/rbac.ts") or a directory prefix ending in "/" ("src/content/tracks/").

/** Workspace packages: foundations shared by every app and module. */
export const PACKAGES = {
  "@tcf/core": { dir: "packages/core", role: "foundation", desc: "إعدادات الموقع، الأعلام، التحقق، التشفير، الـ rate limit" },
  "@tcf/db": { dir: "packages/db", role: "foundation", desc: "عميل قاعدة البيانات، الـ Schema المقسّم، الترحيلات" },
  "@tcf/observability": { dir: "packages/observability", role: "foundation", desc: "المراقبة، تقارير CSP، أحداث التحليلات" },
  "@tcf/identity": { dir: "packages/identity", role: "foundation", desc: "تسجيل الدخول (Auth.js)، الأدوار والصلاحيات، بوابة الإدارة" },
  "@tcf/content": { dir: "packages/content", role: "foundation", desc: "محرّك المحتوى: المسارات، الدروس، المدونة، المرجع، اللغات" },
  "@tcf/ui": { dir: "packages/ui", role: "foundation", desc: "مكونات واجهة عامة قابلة لإعادة الاستخدام" },
  "@tcf/contracts": { dir: "packages/contracts", role: "foundation", desc: "عقود الـ API (zod) المشتركة بين الويب والموبايل" },
  // Feature modules: one per business capability. May depend on foundations;
  // module → module edges are allow-listed in tests/architecture-v2.test.mjs.
  "@tcf/learning": { dir: "modules/learning", role: "module", desc: "تجربة الدرس: العرض، الملعب، المفضلة، آخر زيارة" },
  "@tcf/progress": { dir: "modules/progress", role: "module", desc: "التقدّم، النقاط، الإنجازات، لوحة المتصدرين، لوحة الحساب" },
  "@tcf/assessment": { dir: "modules/assessment", role: "module", desc: "اختبارات التدريب، بنك الأسئلة، الامتحان النهائي" },
  "@tcf/certificates": { dir: "modules/certificates", role: "module", desc: "إصدار الشهادات والتحقق منها" },
  "@tcf/billing": { dir: "modules/billing", role: "module", desc: "الاشتراكات والدفع (Stripe)" },
  "@tcf/creators": { dir: "modules/creators", role: "module", desc: "مركز منشئي المحتوى" },
  "@tcf/academic": { dir: "modules/academic", role: "module", desc: "الجامعات، الخطط الدراسية، خط استخراج المناهج" },
  "@tcf/jobs": { dir: "modules/jobs", role: "module", desc: "الوظائف والتدريب وتنبيهات الوظائف" },
  "@tcf/feedback": { dir: "modules/feedback", role: "module", desc: "اقتراحات الزوار" },
  "@tcf/media": { dir: "modules/media", role: "module", desc: "الفيديو: مزوّدات الاستضافة وتتبّع المشاهدة (جديد)" },
  "@tcf/admin": { dir: "modules/admin", role: "module", desc: "لوحة الإدارة: العمليات، التقارير، المستخدمين، SEO" },
  "@tcf/web": { dir: "apps/web", role: "app", desc: "موقع thecodefix.net (Next.js)" },
};

const L = "src/lib/";
const C = "src/components/";

/** Ordered [from, to] rules. */
export const RULES = [
  // ── apps/web: routes, shell, assets, app-level config ────────────────────
  ["src/app/progress-actions.ts", "modules/progress/src/actions/progress.ts"],
  ["src/app/suggest-actions.ts", "modules/feedback/src/actions/suggest.ts"],
  ["src/app/learn/quiz-actions.ts", "modules/assessment/src/actions/lesson-quiz.ts"],
  ["src/app/quiz/[tech]/exam-actions.ts", "modules/assessment/src/actions/exam.ts"],
  ["src/app/certificate/actions.ts", "modules/certificates/src/actions/certificate.ts"],
  ["src/app/jobs/actions.ts", "modules/jobs/src/actions/alerts.ts"],
  ["src/app/creators/register/actions.ts", "modules/creators/src/actions/register.ts"],
  ["src/app/creators/submissions/actions.ts", "modules/creators/src/actions/submissions.ts"],
  ["src/app/creators/submissions/[postId]/edit/actions.ts", "modules/creators/src/actions/edit-post.ts"],
  ["src/app/creators/dashboard/edit/actions.ts", "modules/creators/src/actions/edit-profile.ts"],
  ["src/app/creators/submit/actions.ts", "modules/creators/src/actions/submit.ts"],
  ["src/app/admin/actions.ts", "packages/identity/src/actions/admin-session.ts"],
  ["src/app/admin/creators/actions.ts", "modules/creators/src/actions/admin-creators.ts"],
  ["src/app/admin/creators/submissions/actions.ts", "modules/creators/src/actions/admin-review.ts"],
  ["src/app/admin/academic/actions.ts", "modules/academic/src/actions/admin-academic.ts"],
  ["src/app/admin/pipeline/test/actions.ts", "modules/academic/src/actions/admin-pipeline.ts"],
  ["src/app/admin/jobs/actions.ts", "modules/jobs/src/actions/admin-jobs.ts"],
  ["src/app/admin/suggestions/actions.ts", "modules/feedback/src/actions/admin-suggestions.ts"],
  ["src/app/admin/quizzes/actions.ts", "modules/assessment/src/actions/admin-quizzes.ts"],
  ["src/app/admin/content/actions.ts", "modules/admin/src/actions/content.ts"],
  ["src/app/admin/settings/actions.ts", "modules/admin/src/actions/settings.ts"],
  ["src/app/admin/seo/actions.ts", "modules/admin/src/actions/seo.ts"],
  ["src/app/admin/reports/actions.ts", "modules/admin/src/actions/reports.ts"],
  ["src/app/admin/operations/content/actions.ts", "modules/admin/src/actions/ops-content.ts"],
  ["src/app/admin/operations/outreach/actions.ts", "modules/admin/src/actions/ops-outreach.ts"],
  ["src/app/admin/operations/tickets/actions.ts", "modules/admin/src/actions/ops-tickets.ts"],
  ["src/app/admin/operations/instructors/actions.ts", "modules/admin/src/actions/ops-instructors.ts"],
  ["src/app/", "apps/web/src/app/"],
  ["src/types/", "apps/web/src/types/"],
  ["src/instrumentation.ts", "apps/web/src/instrumentation.ts"],
  ["public/", "apps/web/public/"],
  ["assets/", "apps/web/assets/"],
  ["next.config.ts", "apps/web/next.config.ts"],
  ["postcss.config.mjs", "apps/web/postcss.config.mjs"],

  // ── packages/db ─────────────────────────────────────────────────────────
  ["src/db/index.ts", "packages/db/src/index.ts"],
  ["src/db/schema.ts", "packages/db/src/schema.ts"],
  ["src/db/schema/", "packages/db/src/schema/"],
  [L + "db-errors.ts", "packages/db/src/errors.ts"],
  ["drizzle/", "packages/db/drizzle/"],
  ["drizzle.config.ts", "packages/db/drizzle.config.ts"],

  // ── packages/core ───────────────────────────────────────────────────────
  [L + "site.ts", "packages/core/src/site.ts"],
  [L + "flags.ts", "packages/core/src/flags.ts"],
  [L + "color.ts", "packages/core/src/color.ts"],
  [L + "validation.ts", "packages/core/src/validation.ts"],
  [L + "request-body.ts", "packages/core/src/request-body.ts"],
  [L + "crypto.ts", "packages/core/src/crypto.ts"],
  [L + "rate-limit.ts", "packages/core/src/rate-limit.ts"],

  // ── packages/observability ──────────────────────────────────────────────
  [L + "monitoring.ts", "packages/observability/src/monitoring.ts"],
  [L + "monitoring-contract.ts", "packages/observability/src/monitoring-contract.ts"],
  [L + "client-monitoring.ts", "packages/observability/src/client-monitoring.ts"],
  [L + "csp-report.ts", "packages/observability/src/csp-report.ts"],
  [L + "analytics.ts", "packages/observability/src/analytics.ts"],
  [L + "analytics-contract.ts", "packages/observability/src/analytics-contract.ts"],

  // ── packages/identity ───────────────────────────────────────────────────
  ["src/auth.ts", "packages/identity/src/auth.ts"],
  [L + "rbac.ts", "packages/identity/src/rbac.ts"],
  [L + "authorization.ts", "packages/identity/src/authorization.ts"],
  [L + "admin-access.ts", "packages/identity/src/admin-access.ts"],
  [L + "admin-token.ts", "packages/identity/src/admin-token.ts"],

  // ── packages/content ────────────────────────────────────────────────────
  [L + "content.ts", "packages/content/src/tracks.ts"],
  [L + "blog.ts", "packages/content/src/blog.ts"],
  [L + "blog-sources.ts", "packages/content/src/blog-sources.ts"],
  [L + "reference.ts", "packages/content/src/reference.ts"],
  [L + "roadmaps.ts", "packages/content/src/roadmaps.ts"],
  [L + "track-resources.ts", "packages/content/src/track-resources.ts"],
  [L + "search-index.ts", "packages/content/src/search-index.ts"],
  [L + "seo.ts", "packages/content/src/seo.ts"],
  [L + "mdx-untrusted.ts", "packages/content/src/mdx-untrusted.ts"],
  [L + "admin-cms.ts", "packages/content/src/admin/cms.ts"],
  [L + "admin-content.ts", "packages/content/src/admin/writer.ts"],

  // ── packages/ui (generic, no domain knowledge) ──────────────────────────
  ...["Breadcrumbs", "JsonLd", "ShareButton", "CountryFlag", "ExportButton", "TableFilter", "PrintButton", "ThemeToggle", "TextSizeControl", "ScrollToTop", "TrackedAnchor", "TrackedCta", "RevealObserver"].map((n) => [`${C}${n}.tsx`, `packages/ui/src/ui/${n}.tsx`]),

  // ── apps/web shell (site chrome that composes many modules) ─────────────
  ...["Header", "Footer", "MegaMenu", "MobileMenu", "UserMenu", "AdminLink", "ExpandableSearch", "CommandPalette", "CommandPaletteClient", "Providers", "AuthConversionTracker"].map((n) => [`${C}${n}.tsx`, `apps/web/src/shell/${n}.tsx`]),

  // ── modules/learning ────────────────────────────────────────────────────
  [L + "bookmarks.ts", "modules/progress/src/bookmarks.ts"],
  [L + "recent.ts", "modules/progress/src/recent.ts"],
  [L + "python-sandbox.ts", "modules/learning/src/python-sandbox.ts"],
  ...["Mdx", "CodeBlock", "Playground", "LessonComplete", "LessonFeedback", "LessonKeyNav", "OnThisPage", "ReadingProgress", "Sidebar", "TrackProgress", "TrackView", "BookmarkButton", "RecordVisit", "ContinueLearning", "ArticleShare"].map((n) => [`${C}${n}.tsx`, `modules/learning/src/ui/${n}.tsx`]),

  // ── modules/progress ────────────────────────────────────────────────────
  [L + "progress.ts", "modules/progress/src/progress.ts"],
  [L + "progress-types.ts", "modules/progress/src/types.ts"],
  [L + "progress-sanitize.ts", "modules/progress/src/sanitize.ts"],
  [L + "points.ts", "modules/progress/src/points.ts"],
  [L + "achievements.ts", "modules/progress/src/achievements.ts"],
  [L + "leaderboard.ts", "modules/progress/src/leaderboard.ts"],
  [L + "trusted-stats.ts", "modules/progress/src/trusted-stats.ts"],
  ...["AccountDashboard", "AccountIdentity", "AchievementsGrid", "LeaderboardTabs", "ProgressSync"].map((n) => [`${C}${n}.tsx`, `modules/progress/src/ui/${n}.tsx`]),

  // ── modules/assessment ──────────────────────────────────────────────────
  [L + "quiz.ts", "packages/content/src/quizzes.ts"],
  [L + "quiz-bank.ts", "modules/assessment/src/quiz-bank.ts"],
  [L + "quiz-requirements.ts", "modules/assessment/src/requirements.ts"],
  [L + "required-lessons.ts", "modules/assessment/src/required-lessons.ts"],
  [L + "exam-policy.ts", "modules/assessment/src/exam-policy.ts"],
  [L + "admin-quizzes.ts", "modules/assessment/src/admin/quizzes.ts"],
  ...["QuizRunner", "LessonQuiz", "ExamRunner", "SignInToSaveCert"].map((n) => [`${C}${n}.tsx`, `modules/assessment/src/ui/${n}.tsx`]),

  // ── modules/certificates ────────────────────────────────────────────────
  [L + "admin-certificates.ts", "modules/certificates/src/certificates.ts"],
  ...["Certificate", "SecureCertificate", "CertificateArtwork", "CertificateNamePrefill"].map((n) => [`${C}${n}.tsx`, `modules/certificates/src/ui/${n}.tsx`]),
  [C + "certificate.css", "modules/certificates/src/ui/certificate.css"],

  // ── modules/billing ─────────────────────────────────────────────────────
  [L + "stripe.ts", "modules/billing/src/stripe.ts"],
  [L + "stripe-sync.ts", "modules/billing/src/stripe-sync.ts"],
  [L + "admin-billing.ts", "modules/billing/src/admin/overview.ts"],
  [C + "SubscribeButton.tsx", "modules/billing/src/ui/SubscribeButton.tsx"],

  // ── modules/creators ────────────────────────────────────────────────────
  [L + "creators.ts", "modules/creators/src/creators.ts"],
  [L + "creators-notifications.ts", "modules/creators/src/notifications.ts"],
  [C + "creators/", "modules/creators/src/ui/"],

  // ── modules/academic ────────────────────────────────────────────────────
  [L + "academic.ts", "modules/academic/src/courses.ts"],
  [L + "academic-universities.ts", "modules/academic/src/universities.ts"],
  [L + "academic-study-plans.ts", "modules/academic/src/study-plans.ts"],
  [L + "academic-indexability.ts", "modules/academic/src/indexability.ts"],
  [L + "prerequisite-graph.ts", "modules/academic/src/prerequisite-graph.ts"],
  [L + "curriculum/", "modules/academic/src/pipeline/"],
  [C + "academic/", "modules/academic/src/ui/"],

  // ── modules/jobs ────────────────────────────────────────────────────────
  [L + "jobs.ts", "modules/jobs/src/jobs.ts"],
  [L + "job-search.ts", "modules/jobs/src/search.ts"],
  [L + "jooble.ts", "modules/jobs/src/jooble.ts"],
  [L + "admin-jobs.ts", "modules/jobs/src/admin/jobs.ts"],
  ...["JobAlertSignup", "JobSearchLinks", "JoobleListings"].map((n) => [`${C}${n}.tsx`, `modules/jobs/src/ui/${n}.tsx`]),

  // ── modules/feedback ────────────────────────────────────────────────────
  [L + "admin-suggestions.ts", "modules/feedback/src/admin/suggestions.ts"],
  [C + "SuggestBox.tsx", "modules/feedback/src/ui/SuggestBox.tsx"],

  // ── modules/admin (back-office composition) ─────────────────────────────
  [L + "admin-diagnostics.ts", "modules/admin/src/diagnostics.ts"],
  [L + "admin-operations.ts", "modules/admin/src/operations.ts"],
  [L + "admin-outreach.ts", "modules/admin/src/outreach.ts"],
  [L + "admin-reports.ts", "modules/admin/src/reports.ts"],
  [L + "admin-seo.ts", "modules/admin/src/seo.ts"],
  [L + "admin-users.ts", "modules/admin/src/users.ts"],
  [L + "changelog.ts", "modules/admin/src/changelog.ts"],
  [L + "roadmap.ts", "modules/admin/src/product-roadmap.ts"],
  [C + "AdminCommandPaletteClient.tsx", "modules/admin/src/ui/AdminCommandPaletteClient.tsx"],

  // ── unreferenced V1 code kept for the curriculum team (not compiled) ────
  [L + "base_repository.ts", "archive/v1-unreferenced/base_repository.ts.txt"],
  [L + "react-base-repository.tsx", "archive/v1-unreferenced/react-base-repository.tsx.txt"],

  // ── content: one tree per locale + locale-neutral data ──────────────────
  ["src/content/tracks/", "content/ar/tracks/"],
  ["src/content/blog/", "content/ar/blog/"],
  ["src/content/reference/", "content/ar/reference/"],
  ["src/content/quizzes/", "content/ar/quizzes/"],
  ["src/content/quiz-bank/", "content/ar/quiz-bank/"],
  ["src/content/roadmaps/", "content/ar/roadmaps/"],
  ["src/content/jobs/", "content/ar/jobs/"],
  ["src/content/academic/", "content/data/academic/"],
  ["src/content/academic-universities/", "content/data/academic-universities/"],
  ["src/content/academic-study-plans/", "content/data/academic-study-plans/"],
  ["src/content/lesson-dates.json", "content/data/lesson-dates.json"],
  ["src/content/lesson-moves.json", "content/data/lesson-moves.json"],
  ["src/content/published-lessons.json", "content/data/published-lessons.json"],
  ["content/wave-1-drafts/", "content/_drafts/wave-1/"],
];

/** Content sub-collections: which locale tree they live in. */
export const CONTENT_COLLECTIONS = {
  tracks: "ar",
  blog: "ar",
  reference: "ar",
  quizzes: "ar",
  "quiz-bank": "ar",
  roadmaps: "ar",
  jobs: "ar",
  academic: "data",
  "academic-universities": "data",
  "academic-study-plans": "data",
};

/** Map a V1 repo path to its V2 path (unchanged when no rule matches). */
export function mapPath(p) {
  for (const [from, to] of RULES) {
    if (from.endsWith("/") ? p.startsWith(from) : p === from) {
      return from.endsWith("/") ? to + p.slice(from.length) : to;
    }
  }
  return p;
}

/** The workspace package a V2 path belongs to, or null (root tooling). */
export function packageOf(p) {
  for (const [name, { dir }] of Object.entries(PACKAGES)) {
    if (p === dir || p.startsWith(dir + "/")) return name;
  }
  return null;
}

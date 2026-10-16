# دليل الانتقال من V1 إلى V2

> مولَّد من `scripts/v2/layout.mjs` بـ `node scripts/v2/migration-doc.mjs` — لا تعدّله يدويًا.
> القاعدة الأولى المطابقة هي اللي بتنطبق؛ القاعدة اللي بتنتهي بـ `/` بتنقل مجلد كامل بنفس بنيته.

## سؤال سريع: وين صار ملفي؟

```bash
node scripts/audit/where.mjs content.ts          # الاسم أو جزء منه — بيعطيك المكان الجديد ومين بيستخدمه
grep -n '"src/lib/content.ts"' scripts/v2/layout.mjs
```

## كيف أنقل فرع قديم؟

```bash
npm run port-branch -- content/css-refresh-2026-09-14      # بيعمل فرع v2/content/css-refresh-2026-09-14
npm run typecheck && npm test && npm run check:all
git push -u origin v2/content/css-refresh-2026-09-14
```

الأداة بتعيد كتابة كل المسارات، بتطبّق التغييرات بطريقة 3-way، بتعيد توليد `lesson-dates.json` بدل دمجه، وبتحوّل استيرادات `@/lib/…` القديمة لأسماء V2. تمت تجربتها على `content/css-refresh-2026-09-14`: 4 ملفات وصلت لأماكنها الجديدة وكل الفحوصات نجحت.

## الاستيراد: قبل وبعد

| V1 | V2 |
|---|---|
| `import { getTracks } from "@/lib/content"` | `import { getTracks } from "@tcf/content/tracks"` |
| `import { db } from "@/db"` | `import { db } from "@tcf/db"` |
| `import { requireCapability } from "@/lib/authorization"` | `import { requireCapability } from "@tcf/identity/authorization"` |
| `import ExamRunner from "@/components/ExamRunner"` | `import ExamRunner from "@tcf/assessment/ui/ExamRunner"` |
| `import { startOrResumeExam } from "@/app/quiz/[tech]/exam-actions"` | `import { startOrResumeExam } from "@tcf/assessment/actions/exam"` |
| `path.join(process.cwd(), "src", "content", "blog")` | `contentDir("blog")` من `@tcf/content/paths` |

## كل القواعد (185)

| V1 | V2 | الحزمة |
|---|---|---|
| `src/app/progress-actions.ts` | `modules/progress/src/actions/progress.ts` | `@tcf/progress` |
| `src/app/suggest-actions.ts` | `modules/feedback/src/actions/suggest.ts` | `@tcf/feedback` |
| `src/app/learn/quiz-actions.ts` | `modules/assessment/src/actions/lesson-quiz.ts` | `@tcf/assessment` |
| `src/app/quiz/[tech]/exam-actions.ts` | `modules/assessment/src/actions/exam.ts` | `@tcf/assessment` |
| `src/app/certificate/actions.ts` | `modules/certificates/src/actions/certificate.ts` | `@tcf/certificates` |
| `src/app/jobs/actions.ts` | `modules/jobs/src/actions/alerts.ts` | `@tcf/jobs` |
| `src/app/creators/register/actions.ts` | `modules/creators/src/actions/register.ts` | `@tcf/creators` |
| `src/app/creators/submissions/actions.ts` | `modules/creators/src/actions/submissions.ts` | `@tcf/creators` |
| `src/app/creators/submissions/[postId]/edit/actions.ts` | `modules/creators/src/actions/edit-post.ts` | `@tcf/creators` |
| `src/app/creators/dashboard/edit/actions.ts` | `modules/creators/src/actions/edit-profile.ts` | `@tcf/creators` |
| `src/app/creators/submit/actions.ts` | `modules/creators/src/actions/submit.ts` | `@tcf/creators` |
| `src/app/admin/actions.ts` | `packages/identity/src/actions/admin-session.ts` | `@tcf/identity` |
| `src/app/admin/creators/actions.ts` | `modules/creators/src/actions/admin-creators.ts` | `@tcf/creators` |
| `src/app/admin/creators/submissions/actions.ts` | `modules/creators/src/actions/admin-review.ts` | `@tcf/creators` |
| `src/app/admin/academic/actions.ts` | `modules/academic/src/actions/admin-academic.ts` | `@tcf/academic` |
| `src/app/admin/pipeline/test/actions.ts` | `modules/academic/src/actions/admin-pipeline.ts` | `@tcf/academic` |
| `src/app/admin/jobs/actions.ts` | `modules/jobs/src/actions/admin-jobs.ts` | `@tcf/jobs` |
| `src/app/admin/suggestions/actions.ts` | `modules/feedback/src/actions/admin-suggestions.ts` | `@tcf/feedback` |
| `src/app/admin/quizzes/actions.ts` | `modules/assessment/src/actions/admin-quizzes.ts` | `@tcf/assessment` |
| `src/app/admin/content/actions.ts` | `modules/admin/src/actions/content.ts` | `@tcf/admin` |
| `src/app/admin/settings/actions.ts` | `modules/admin/src/actions/settings.ts` | `@tcf/admin` |
| `src/app/admin/seo/actions.ts` | `modules/admin/src/actions/seo.ts` | `@tcf/admin` |
| `src/app/admin/reports/actions.ts` | `modules/admin/src/actions/reports.ts` | `@tcf/admin` |
| `src/app/admin/operations/content/actions.ts` | `modules/admin/src/actions/ops-content.ts` | `@tcf/admin` |
| `src/app/admin/operations/outreach/actions.ts` | `modules/admin/src/actions/ops-outreach.ts` | `@tcf/admin` |
| `src/app/admin/operations/tickets/actions.ts` | `modules/admin/src/actions/ops-tickets.ts` | `@tcf/admin` |
| `src/app/admin/operations/instructors/actions.ts` | `modules/admin/src/actions/ops-instructors.ts` | `@tcf/admin` |
| `src/app/` | `apps/web/src/app/` | `@tcf/web` |
| `src/types/` | `apps/web/src/types/` | `@tcf/web` |
| `src/instrumentation.ts` | `apps/web/src/instrumentation.ts` | `@tcf/web` |
| `public/` | `apps/web/public/` | `@tcf/web` |
| `assets/` | `apps/web/assets/` | `@tcf/web` |
| `next.config.ts` | `apps/web/next.config.ts` | `@tcf/web` |
| `postcss.config.mjs` | `apps/web/postcss.config.mjs` | `@tcf/web` |
| `src/db/index.ts` | `packages/db/src/index.ts` | `@tcf/db` |
| `src/db/schema.ts` | `packages/db/src/schema.ts` | `@tcf/db` |
| `src/db/schema/` | `packages/db/src/schema/` | `@tcf/db` |
| `src/lib/db-errors.ts` | `packages/db/src/errors.ts` | `@tcf/db` |
| `drizzle/` | `packages/db/drizzle/` | `@tcf/db` |
| `drizzle.config.ts` | `packages/db/drizzle.config.ts` | `@tcf/db` |
| `src/lib/site.ts` | `packages/core/src/site.ts` | `@tcf/core` |
| `src/lib/flags.ts` | `packages/core/src/flags.ts` | `@tcf/core` |
| `src/lib/color.ts` | `packages/core/src/color.ts` | `@tcf/core` |
| `src/lib/validation.ts` | `packages/core/src/validation.ts` | `@tcf/core` |
| `src/lib/request-body.ts` | `packages/core/src/request-body.ts` | `@tcf/core` |
| `src/lib/crypto.ts` | `packages/core/src/crypto.ts` | `@tcf/core` |
| `src/lib/rate-limit.ts` | `packages/core/src/rate-limit.ts` | `@tcf/core` |
| `src/lib/monitoring.ts` | `packages/observability/src/monitoring.ts` | `@tcf/observability` |
| `src/lib/monitoring-contract.ts` | `packages/observability/src/monitoring-contract.ts` | `@tcf/observability` |
| `src/lib/client-monitoring.ts` | `packages/observability/src/client-monitoring.ts` | `@tcf/observability` |
| `src/lib/csp-report.ts` | `packages/observability/src/csp-report.ts` | `@tcf/observability` |
| `src/lib/analytics.ts` | `packages/observability/src/analytics.ts` | `@tcf/observability` |
| `src/lib/analytics-contract.ts` | `packages/observability/src/analytics-contract.ts` | `@tcf/observability` |
| `src/auth.ts` | `packages/identity/src/auth.ts` | `@tcf/identity` |
| `src/lib/rbac.ts` | `packages/identity/src/rbac.ts` | `@tcf/identity` |
| `src/lib/authorization.ts` | `packages/identity/src/authorization.ts` | `@tcf/identity` |
| `src/lib/admin-access.ts` | `packages/identity/src/admin-access.ts` | `@tcf/identity` |
| `src/lib/admin-token.ts` | `packages/identity/src/admin-token.ts` | `@tcf/identity` |
| `src/lib/content.ts` | `packages/content/src/tracks.ts` | `@tcf/content` |
| `src/lib/blog.ts` | `packages/content/src/blog.ts` | `@tcf/content` |
| `src/lib/blog-sources.ts` | `packages/content/src/blog-sources.ts` | `@tcf/content` |
| `src/lib/reference.ts` | `packages/content/src/reference.ts` | `@tcf/content` |
| `src/lib/roadmaps.ts` | `packages/content/src/roadmaps.ts` | `@tcf/content` |
| `src/lib/track-resources.ts` | `packages/content/src/track-resources.ts` | `@tcf/content` |
| `src/lib/search-index.ts` | `packages/content/src/search-index.ts` | `@tcf/content` |
| `src/lib/seo.ts` | `packages/content/src/seo.ts` | `@tcf/content` |
| `src/lib/mdx-untrusted.ts` | `packages/content/src/mdx-untrusted.ts` | `@tcf/content` |
| `src/lib/admin-cms.ts` | `packages/content/src/admin/cms.ts` | `@tcf/content` |
| `src/lib/admin-content.ts` | `packages/content/src/admin/writer.ts` | `@tcf/content` |
| `src/components/Breadcrumbs.tsx` | `packages/ui/src/ui/Breadcrumbs.tsx` | `@tcf/ui` |
| `src/components/JsonLd.tsx` | `packages/ui/src/ui/JsonLd.tsx` | `@tcf/ui` |
| `src/components/ShareButton.tsx` | `packages/ui/src/ui/ShareButton.tsx` | `@tcf/ui` |
| `src/components/CountryFlag.tsx` | `packages/ui/src/ui/CountryFlag.tsx` | `@tcf/ui` |
| `src/components/ExportButton.tsx` | `packages/ui/src/ui/ExportButton.tsx` | `@tcf/ui` |
| `src/components/TableFilter.tsx` | `packages/ui/src/ui/TableFilter.tsx` | `@tcf/ui` |
| `src/components/PrintButton.tsx` | `packages/ui/src/ui/PrintButton.tsx` | `@tcf/ui` |
| `src/components/ThemeToggle.tsx` | `packages/ui/src/ui/ThemeToggle.tsx` | `@tcf/ui` |
| `src/components/TextSizeControl.tsx` | `packages/ui/src/ui/TextSizeControl.tsx` | `@tcf/ui` |
| `src/components/ScrollToTop.tsx` | `packages/ui/src/ui/ScrollToTop.tsx` | `@tcf/ui` |
| `src/components/TrackedAnchor.tsx` | `packages/ui/src/ui/TrackedAnchor.tsx` | `@tcf/ui` |
| `src/components/TrackedCta.tsx` | `packages/ui/src/ui/TrackedCta.tsx` | `@tcf/ui` |
| `src/components/RevealObserver.tsx` | `packages/ui/src/ui/RevealObserver.tsx` | `@tcf/ui` |
| `src/components/Header.tsx` | `apps/web/src/shell/Header.tsx` | `@tcf/web` |
| `src/components/Footer.tsx` | `apps/web/src/shell/Footer.tsx` | `@tcf/web` |
| `src/components/MegaMenu.tsx` | `apps/web/src/shell/MegaMenu.tsx` | `@tcf/web` |
| `src/components/MobileMenu.tsx` | `apps/web/src/shell/MobileMenu.tsx` | `@tcf/web` |
| `src/components/UserMenu.tsx` | `apps/web/src/shell/UserMenu.tsx` | `@tcf/web` |
| `src/components/AdminLink.tsx` | `apps/web/src/shell/AdminLink.tsx` | `@tcf/web` |
| `src/components/ExpandableSearch.tsx` | `apps/web/src/shell/ExpandableSearch.tsx` | `@tcf/web` |
| `src/components/CommandPalette.tsx` | `apps/web/src/shell/CommandPalette.tsx` | `@tcf/web` |
| `src/components/CommandPaletteClient.tsx` | `apps/web/src/shell/CommandPaletteClient.tsx` | `@tcf/web` |
| `src/components/Providers.tsx` | `apps/web/src/shell/Providers.tsx` | `@tcf/web` |
| `src/components/AuthConversionTracker.tsx` | `apps/web/src/shell/AuthConversionTracker.tsx` | `@tcf/web` |
| `src/lib/bookmarks.ts` | `modules/progress/src/bookmarks.ts` | `@tcf/progress` |
| `src/lib/recent.ts` | `modules/progress/src/recent.ts` | `@tcf/progress` |
| `src/lib/python-sandbox.ts` | `modules/learning/src/python-sandbox.ts` | `@tcf/learning` |
| `src/components/Mdx.tsx` | `modules/learning/src/ui/Mdx.tsx` | `@tcf/learning` |
| `src/components/CodeBlock.tsx` | `modules/learning/src/ui/CodeBlock.tsx` | `@tcf/learning` |
| `src/components/Playground.tsx` | `modules/learning/src/ui/Playground.tsx` | `@tcf/learning` |
| `src/components/LessonComplete.tsx` | `modules/learning/src/ui/LessonComplete.tsx` | `@tcf/learning` |
| `src/components/LessonFeedback.tsx` | `modules/learning/src/ui/LessonFeedback.tsx` | `@tcf/learning` |
| `src/components/LessonKeyNav.tsx` | `modules/learning/src/ui/LessonKeyNav.tsx` | `@tcf/learning` |
| `src/components/OnThisPage.tsx` | `modules/learning/src/ui/OnThisPage.tsx` | `@tcf/learning` |
| `src/components/ReadingProgress.tsx` | `modules/learning/src/ui/ReadingProgress.tsx` | `@tcf/learning` |
| `src/components/Sidebar.tsx` | `modules/learning/src/ui/Sidebar.tsx` | `@tcf/learning` |
| `src/components/TrackProgress.tsx` | `modules/learning/src/ui/TrackProgress.tsx` | `@tcf/learning` |
| `src/components/TrackView.tsx` | `modules/learning/src/ui/TrackView.tsx` | `@tcf/learning` |
| `src/components/BookmarkButton.tsx` | `modules/learning/src/ui/BookmarkButton.tsx` | `@tcf/learning` |
| `src/components/RecordVisit.tsx` | `modules/learning/src/ui/RecordVisit.tsx` | `@tcf/learning` |
| `src/components/ContinueLearning.tsx` | `modules/learning/src/ui/ContinueLearning.tsx` | `@tcf/learning` |
| `src/components/ArticleShare.tsx` | `modules/learning/src/ui/ArticleShare.tsx` | `@tcf/learning` |
| `src/lib/progress.ts` | `modules/progress/src/progress.ts` | `@tcf/progress` |
| `src/lib/progress-types.ts` | `modules/progress/src/types.ts` | `@tcf/progress` |
| `src/lib/progress-sanitize.ts` | `modules/progress/src/sanitize.ts` | `@tcf/progress` |
| `src/lib/points.ts` | `modules/progress/src/points.ts` | `@tcf/progress` |
| `src/lib/achievements.ts` | `modules/progress/src/achievements.ts` | `@tcf/progress` |
| `src/lib/leaderboard.ts` | `modules/progress/src/leaderboard.ts` | `@tcf/progress` |
| `src/lib/trusted-stats.ts` | `modules/progress/src/trusted-stats.ts` | `@tcf/progress` |
| `src/components/AccountDashboard.tsx` | `modules/progress/src/ui/AccountDashboard.tsx` | `@tcf/progress` |
| `src/components/AccountIdentity.tsx` | `modules/progress/src/ui/AccountIdentity.tsx` | `@tcf/progress` |
| `src/components/AchievementsGrid.tsx` | `modules/progress/src/ui/AchievementsGrid.tsx` | `@tcf/progress` |
| `src/components/LeaderboardTabs.tsx` | `modules/progress/src/ui/LeaderboardTabs.tsx` | `@tcf/progress` |
| `src/components/ProgressSync.tsx` | `modules/progress/src/ui/ProgressSync.tsx` | `@tcf/progress` |
| `src/lib/quiz.ts` | `packages/content/src/quizzes.ts` | `@tcf/content` |
| `src/lib/quiz-bank.ts` | `modules/assessment/src/quiz-bank.ts` | `@tcf/assessment` |
| `src/lib/quiz-requirements.ts` | `modules/assessment/src/requirements.ts` | `@tcf/assessment` |
| `src/lib/required-lessons.ts` | `modules/assessment/src/required-lessons.ts` | `@tcf/assessment` |
| `src/lib/exam-policy.ts` | `modules/assessment/src/exam-policy.ts` | `@tcf/assessment` |
| `src/lib/admin-quizzes.ts` | `modules/assessment/src/admin/quizzes.ts` | `@tcf/assessment` |
| `src/components/QuizRunner.tsx` | `modules/assessment/src/ui/QuizRunner.tsx` | `@tcf/assessment` |
| `src/components/LessonQuiz.tsx` | `modules/assessment/src/ui/LessonQuiz.tsx` | `@tcf/assessment` |
| `src/components/ExamRunner.tsx` | `modules/assessment/src/ui/ExamRunner.tsx` | `@tcf/assessment` |
| `src/components/SignInToSaveCert.tsx` | `modules/assessment/src/ui/SignInToSaveCert.tsx` | `@tcf/assessment` |
| `src/lib/admin-certificates.ts` | `modules/certificates/src/certificates.ts` | `@tcf/certificates` |
| `src/components/Certificate.tsx` | `modules/certificates/src/ui/Certificate.tsx` | `@tcf/certificates` |
| `src/components/SecureCertificate.tsx` | `modules/certificates/src/ui/SecureCertificate.tsx` | `@tcf/certificates` |
| `src/components/CertificateArtwork.tsx` | `modules/certificates/src/ui/CertificateArtwork.tsx` | `@tcf/certificates` |
| `src/components/CertificateNamePrefill.tsx` | `modules/certificates/src/ui/CertificateNamePrefill.tsx` | `@tcf/certificates` |
| `src/components/certificate.css` | `modules/certificates/src/ui/certificate.css` | `@tcf/certificates` |
| `src/lib/stripe.ts` | `modules/billing/src/stripe.ts` | `@tcf/billing` |
| `src/lib/stripe-sync.ts` | `modules/billing/src/stripe-sync.ts` | `@tcf/billing` |
| `src/lib/admin-billing.ts` | `modules/billing/src/admin/overview.ts` | `@tcf/billing` |
| `src/components/SubscribeButton.tsx` | `modules/billing/src/ui/SubscribeButton.tsx` | `@tcf/billing` |
| `src/lib/creators.ts` | `modules/creators/src/creators.ts` | `@tcf/creators` |
| `src/lib/creators-notifications.ts` | `modules/creators/src/notifications.ts` | `@tcf/creators` |
| `src/components/creators/` | `modules/creators/src/ui/` | `@tcf/creators` |
| `src/lib/academic.ts` | `modules/academic/src/courses.ts` | `@tcf/academic` |
| `src/lib/academic-universities.ts` | `modules/academic/src/universities.ts` | `@tcf/academic` |
| `src/lib/academic-study-plans.ts` | `modules/academic/src/study-plans.ts` | `@tcf/academic` |
| `src/lib/academic-indexability.ts` | `modules/academic/src/indexability.ts` | `@tcf/academic` |
| `src/lib/prerequisite-graph.ts` | `modules/academic/src/prerequisite-graph.ts` | `@tcf/academic` |
| `src/lib/curriculum/` | `modules/academic/src/pipeline/` | `@tcf/academic` |
| `src/components/academic/` | `modules/academic/src/ui/` | `@tcf/academic` |
| `src/lib/jobs.ts` | `modules/jobs/src/jobs.ts` | `@tcf/jobs` |
| `src/lib/job-search.ts` | `modules/jobs/src/search.ts` | `@tcf/jobs` |
| `src/lib/jooble.ts` | `modules/jobs/src/jooble.ts` | `@tcf/jobs` |
| `src/lib/admin-jobs.ts` | `modules/jobs/src/admin/jobs.ts` | `@tcf/jobs` |
| `src/components/JobAlertSignup.tsx` | `modules/jobs/src/ui/JobAlertSignup.tsx` | `@tcf/jobs` |
| `src/components/JobSearchLinks.tsx` | `modules/jobs/src/ui/JobSearchLinks.tsx` | `@tcf/jobs` |
| `src/components/JoobleListings.tsx` | `modules/jobs/src/ui/JoobleListings.tsx` | `@tcf/jobs` |
| `src/lib/admin-suggestions.ts` | `modules/feedback/src/admin/suggestions.ts` | `@tcf/feedback` |
| `src/components/SuggestBox.tsx` | `modules/feedback/src/ui/SuggestBox.tsx` | `@tcf/feedback` |
| `src/lib/admin-diagnostics.ts` | `modules/admin/src/diagnostics.ts` | `@tcf/admin` |
| `src/lib/admin-operations.ts` | `modules/admin/src/operations.ts` | `@tcf/admin` |
| `src/lib/admin-outreach.ts` | `modules/admin/src/outreach.ts` | `@tcf/admin` |
| `src/lib/admin-reports.ts` | `modules/admin/src/reports.ts` | `@tcf/admin` |
| `src/lib/admin-seo.ts` | `modules/admin/src/seo.ts` | `@tcf/admin` |
| `src/lib/admin-users.ts` | `modules/admin/src/users.ts` | `@tcf/admin` |
| `src/lib/changelog.ts` | `modules/admin/src/changelog.ts` | `@tcf/admin` |
| `src/lib/roadmap.ts` | `modules/admin/src/product-roadmap.ts` | `@tcf/admin` |
| `src/components/AdminCommandPaletteClient.tsx` | `modules/admin/src/ui/AdminCommandPaletteClient.tsx` | `@tcf/admin` |
| `src/lib/base_repository.ts` | `archive/v1-unreferenced/base_repository.ts.txt` | أرشيف |
| `src/lib/react-base-repository.tsx` | `archive/v1-unreferenced/react-base-repository.tsx.txt` | أرشيف |
| `src/content/tracks/` | `content/ar/tracks/` | المحتوى |
| `src/content/blog/` | `content/ar/blog/` | المحتوى |
| `src/content/reference/` | `content/ar/reference/` | المحتوى |
| `src/content/quizzes/` | `content/ar/quizzes/` | المحتوى |
| `src/content/quiz-bank/` | `content/ar/quiz-bank/` | المحتوى |
| `src/content/roadmaps/` | `content/ar/roadmaps/` | المحتوى |
| `src/content/jobs/` | `content/ar/jobs/` | المحتوى |
| `src/content/academic/` | `content/data/academic/` | المحتوى |
| `src/content/academic-universities/` | `content/data/academic-universities/` | المحتوى |
| `src/content/academic-study-plans/` | `content/data/academic-study-plans/` | المحتوى |
| `src/content/lesson-dates.json` | `content/data/lesson-dates.json` | المحتوى |
| `content/wave-1-drafts/` | `content/_drafts/wave-1/` | المحتوى |

## الحزم (19)

| الحزمة | المكان | النوع | الوصف |
|---|---|---|---|
| `@tcf/core` | `packages/core` | foundation | إعدادات الموقع، الأعلام، التحقق، التشفير، الـ rate limit |
| `@tcf/db` | `packages/db` | foundation | عميل قاعدة البيانات، الـ Schema المقسّم، الترحيلات |
| `@tcf/observability` | `packages/observability` | foundation | المراقبة، تقارير CSP، أحداث التحليلات |
| `@tcf/identity` | `packages/identity` | foundation | تسجيل الدخول (Auth.js)، الأدوار والصلاحيات، بوابة الإدارة |
| `@tcf/content` | `packages/content` | foundation | محرّك المحتوى: المسارات، الدروس، المدونة، المرجع، اللغات |
| `@tcf/ui` | `packages/ui` | foundation | مكونات واجهة عامة قابلة لإعادة الاستخدام |
| `@tcf/contracts` | `packages/contracts` | foundation | عقود الـ API (zod) المشتركة بين الويب والموبايل |
| `@tcf/learning` | `modules/learning` | module | تجربة الدرس: العرض، الملعب، المفضلة، آخر زيارة |
| `@tcf/progress` | `modules/progress` | module | التقدّم، النقاط، الإنجازات، لوحة المتصدرين، لوحة الحساب |
| `@tcf/assessment` | `modules/assessment` | module | اختبارات التدريب، بنك الأسئلة، الامتحان النهائي |
| `@tcf/certificates` | `modules/certificates` | module | إصدار الشهادات والتحقق منها |
| `@tcf/billing` | `modules/billing` | module | الاشتراكات والدفع (Stripe) |
| `@tcf/creators` | `modules/creators` | module | مركز منشئي المحتوى |
| `@tcf/academic` | `modules/academic` | module | الجامعات، الخطط الدراسية، خط استخراج المناهج |
| `@tcf/jobs` | `modules/jobs` | module | الوظائف والتدريب وتنبيهات الوظائف |
| `@tcf/feedback` | `modules/feedback` | module | اقتراحات الزوار |
| `@tcf/media` | `modules/media` | module | الفيديو: مزوّدات الاستضافة وتتبّع المشاهدة (جديد) |
| `@tcf/admin` | `modules/admin` | module | لوحة الإدارة: العمليات، التقارير، المستخدمين، SEO |
| `@tcf/web` | `apps/web` | app | موقع thecodefix.net (Next.js) |

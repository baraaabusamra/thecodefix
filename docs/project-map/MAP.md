# 🗺️ خريطة مشروع The Code Fix

> زي خريطة المول: كل **منطقة** (zone) فيها **محلات** (مجلدات)، وكل محل فيه ملفات.
> النسخة التفاعلية: افتح `docs/project-map/index.html` (أو رابط الـ artifact).
> هذا الملف بيتولّد تلقائياً — لا تعدّله يدوياً. حدّثه بـ: `node scripts/audit/run-all.mjs`

**Commit:** `cd96891` · **تاريخ:** 2026-10-16 · **ملفات:** 2630 · **ملاحظات الفحص على main:** 741

## مفتاح الخريطة

| الرمز | المعنى |
|---|---|
| 🟥 critical | لازم ينصلّح فوراً |
| 🔴 high | مهم — قبل أي نشر |
| 🟠 medium | يستاهل يتصلّح |
| 🟡 low | تحسين / مراجعة |
| 🔵 info | معلومة للعلم |

## نظرة من فوق

```
┌──────────────────────────┬──────────────────────────┬──────────────────────────┐
│ 📚 مستودع المحتوى        │ 🎓 منطقة التعلّم         │ 🛠️ لوحة الإدارة         │
├──────────────────────────┼──────────────────────────┼──────────────────────────┤
│ 🧩 ورشة المكونات         │ 🏛️ الساحة المركزية —    │ 🎨 منشئو المحتوى         │
├──────────────────────────┼──────────────────────────┼──────────────────────────┤
│ ⚙️ غرفة المحرّك — المك   │ 🏭 خط استخراج المناهج    │ 🔐 الحسابات والدفع       │
├──────────────────────────┼──────────────────────────┼──────────────────────────┤
│ 🗄️ قبو البيانات         │ 🧪 مختبر الجودة          │ 📖 المكتبة — التوثيق و   │
├──────────────────────────┴──────────────────────────┴──────────────────────────┤
│                 🚪 المدخل — الإعدادات   ← المدخل                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

| المنطقة | ملفات | أسطر | ملاحظات |
|---|---:|---:|---|
| 🚪 [المدخل — الإعدادات](#config) | 12 | 13,510 | 🟥 1 🔴 7 🟠 6 🟡 1 |
| 🏛️ [الساحة المركزية — هيكل الموقع](#core) | 17 | 1,874 | ✅ |
| 🎓 [منطقة التعلّم](#learning) | 23 | 3,566 | ✅ |
| 📰 [المدونة](#blog) | 4 | 406 | ✅ |
| 🏫 [الأكاديمي — الجامعات](#academic) | 7 | 884 | ✅ |
| 💼 [الوظائف والتدريب](#jobs) | 5 | 683 | 🔵 1 |
| 🎨 [منشئو المحتوى](#creators) | 30 | 2,116 | ✅ |
| 🔐 [الحسابات والدفع](#accounts) | 9 | 551 | ✅ |
| 🛠️ [لوحة الإدارة](#admin) | 59 | 8,578 | 🟡 1 🔵 1 |
| 🔌 [خدمات API أخرى](#api) | 2 | 102 | ✅ |
| 🧩 [ورشة المكونات](#components) | 61 | 6,176 | ✅ |
| 🏭 [خط استخراج المناهج](#pipeline) | 20 | 2,364 | ✅ |
| ⚙️ [غرفة المحرّك — المكتبات](#lib) | 71 | 7,522 | 🔵 1 |
| 🗄️ [قبو البيانات](#data) | 75 | 79,406 | ✅ |
| 📚 [مستودع المحتوى](#content) | 1653 | 184,143 | 🟠 2 🟡 644 🔵 76 |
| 🧪 [مختبر الجودة](#quality) | 97 | 15,304 | ✅ |
| 📖 [المكتبة — التوثيق والقواعد](#docs) | 474 | 66,685 | ✅ |
| 🖼️ [المخزن — ملفات عامة](#assets) | 11 | 216 | ✅ |
| ❔ [متفرقات](#other) | 0 | 0 | ✅ |


## <a id="config"></a>🚪 المدخل — الإعدادات

ملفات الإعداد بجذر المشروع: الحزم، Next.js، TypeScript، ESLint، Drizzle، ومتغيرات البيئة النموذجية. من هون بيبلش كل إشي.

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `(root)` | 10 | package.json، next.config.ts، tsconfig، eslint، drizzle.config | 🟥 1 🔴 7 🟠 6 🟡 1 |
| `.github` | 2 | GitHub Actions: CI على كل push وPR لـ main | ✅ |

**📌 أهم الملاحظات هون:**

- 🟠 `next.config.ts:27` — الـ CSP شغّال بوضع Report-Only بس — بيسجّل المخالفات بدون ما يمنعها.
- 🟠 `package-lock.json:4039` — مكتبة argparse (1.0.0 - 1.0.10) فيها ثغرة معروفة: advisory — عبر مكتبة ثانية.
- 🔴 `package-lock.json:4283` — مكتبة axios (1.0.0 - 1.19.0) فيها ثغرة معروفة: Axios: Prototype pollution gadget in fetch adapter can alter outbound requests — عبر مكتبة ثانية.
- 🟠 `package-lock.json:4367` — مكتبة baseline-browser-mapping (>=2.0.0 <2.11.0) فيها ثغرة معروفة: baseline-browser-mapping process termination on invalid input causes denial of service — عبر مكتبة ثانية.
- 🟠 `package-lock.json:5066` — مكتبة dompurify (<=3.4.15) فيها ثغرة معروفة: DOMPurify: Permanent `ALLOWED_ATTR` pollution via `setConfig()` bypassing the hook clone-guard (incomplete fix of the 3.4.7 hook-pollution patch) — عبر مكتبة ثانية.
- 🔴 `package-lock.json:7686` — مكتبة js-yaml (3.0.0 - 3.15.2) فيها ثغرة معروفة: JS-YAML: Quadratic CPU consumption in !!omap resolution (3.x and 4.x) — CVE-2026-59870 fix not backported — عبر مكتبة ثانية.
- 🟠 `package-lock.json:9371` — مكتبة monaco-editor (0.54.0-dev-20250909 - 0.56.0) فيها ثغرة معروفة: advisory — عبر مكتبة ثانية.
- 🔴 `package-lock.json:9388` — مكتبة nanoid (<=3.3.17) فيها ثغرة معروفة: nanoid: non-secure generators can loop indefinitely with negative size — عبر مكتبة ثانية.
- 🟥 `package-lock.json:9429` — مكتبة next (9.3.4-canary.0 - 16.3.7) فيها ثغرة معروفة: Next.js: Unauthenticated Remote Code Execution on windows-hosted servers.
- 🔴 `package-lock.json:10107` — مكتبة postcss (<=8.5.22) فيها ثغرة معروفة: PostCSS has XSS via Unescaped </style> in its CSS Stringify Output — عبر مكتبة ثانية.
- 🔴 `package-lock.json:10826` — مكتبة sharp (<=0.35.5-rc.1) فيها ثغرة معروفة: sharp inherited vulnerabilities in libvips: CVE-2026-33327, CVE-2026-33328, CVE-2026-35590, CVE-2026-35591 — عبر مكتبة ثانية.
- 🔴 `package-lock.json:10996` — مكتبة source-map-js (1.0.0 - 1.2.1) فيها ثغرة معروفة: source-map-js allows event-loop denial of service through indexed source-map section offsets — عبر مكتبة ثانية.
- 🟠 `package-lock.json:11036` — مكتبة sprintf-js (*) فيها ثغرة معروفة: sprintf-js vulnerable to denial of service through unbounded precision specifiers — عبر مكتبة ثانية.
- 🔴 `package-lock.json:12186` — مكتبة undici (<=6.28.0 || 7.0.0 - 7.29.0) فيها ثغرة معروفة: undici vulnerable to Denial of Service via unhandled error in WebSocket permessage-deflate decompression — عبر مكتبة ثانية.

## <a id="core"></a>🏛️ الساحة المركزية — هيكل الموقع

الإطار اللي بيلف كل الصفحات: layout، الصفحة الرئيسية، sitemap وrobots، صفحات الخطأ، والصفحات الثابتة (من نحن، تواصل، الخصوصية، الشروط).

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `src/app (root)` | 12 | layout.tsx (الهيكل العام)، page.tsx (الرئيسية)، sitemap، robots، صفحات الخطأ | ✅ |
| `src/app/privacy` | 1 |  | ✅ |
| `src/app/terms` | 1 |  | ✅ |
| `src/app/about` | 1 |  | ✅ |
| `src/app/contact` | 1 |  | ✅ |
| `src/types` | 1 |  | ✅ |

## <a id="learning"></a>🎓 منطقة التعلّم

قلب الموقع للطالب: المسارات والدروس، الاختبارات والامتحانات، الشهادات والتحقق منها، الملعب (Playground)، لوحة المتصدرين، خرائط الطريق، المرجع، والبحث.

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `src/app/learn` | 6 | /learn ← /learn/[tech] ← /learn/[tech]/[lesson] | ✅ |
| `src/app/quiz` | 2 | /quiz/[tech] + exam-actions (تصحيح على السيرفر) | ✅ |
| `src/app/reference` | 3 | /reference/[section]/[slug] | ✅ |
| `src/app/roadmaps` | 2 |  | ✅ |
| `src/app/certificate` | 2 | إصدار الشهادة بعد امتحان مصحّح على السيرفر | ✅ |
| `src/app/progress-actions` | 1 |  | ✅ |
| `src/app/verify` | 2 | /verify/[certificateId] — صفحة عامة | ✅ |
| `src/app/api` | 1 |  | ✅ |
| `src/app/playground` | 1 | محرر Monaco + تشغيل Python بالمتصفح | ✅ |
| `src/app/leaderboard` | 1 |  | ✅ |
| `src/app/search` | 1 | noindex + follow (seo-technical-policy §11) | ✅ |
| `src/app/suggest-actions` | 1 |  | ✅ |

## <a id="blog"></a>📰 المدونة

صفحات قائمة المقالات وصفحة المقال الواحد (المحتوى نفسه بمستودع المحتوى).

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `src/app/blog` | 4 |  | ✅ |

## <a id="academic"></a>🏫 الأكاديمي — الجامعات

دول ← جامعات ← تخصصات ← خطط دراسية ومواد. كيان فرعي مستقل عن المسارات (seo-technical-policy §16).

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `src/app/academic` | 7 |  | ✅ |

## <a id="jobs"></a>💼 الوظائف والتدريب

صفحات الوظائف حسب الدولة (من Jooble) والتدريب، وتنبيهات الوظائف بالإيميل.

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `src/app/jobs` | 3 |  | 🔵 1 |
| `src/app/training` | 2 |  | ✅ |

## <a id="creators"></a>🎨 منشئو المحتوى

مركز صنّاع المحتوى: التسجيل، لوحة التحكم، إرسال المنشورات ومراجعتها، المعرض، وصفحات المنشئين العامة.

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `src/components/creators` | 13 |  | ✅ |
| `src/app/creators/submissions` | 4 |  | ✅ |
| `src/app/creators/[displayName]` | 2 |  | ✅ |
| `src/app/creators/submit` | 2 |  | ✅ |
| `src/app/creators/dashboard` | 3 |  | ✅ |
| `src/app/creators/register` | 2 |  | ✅ |
| `src/app/api/creators` | 1 |  | ✅ |
| `src/app/creators/gallery` | 1 |  | ✅ |
| `src/app/creators` | 2 |  | ✅ |

## <a id="accounts"></a>🔐 الحسابات والدفع

تسجيل الدخول (NextAuth)، صفحة الحساب، الأسعار، الدفع عبر Stripe والـ webhook، والإشعارات.

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `src/app/login` | 2 |  | ✅ |
| `src/app/pricing` | 1 |  | ✅ |
| `src/app/api/checkout` | 1 |  | ✅ |
| `src/app/api/stripe` | 1 |  | ✅ |
| `src/auth.ts` | 1 |  | ✅ |
| `src/app/account` | 1 |  | ✅ |
| `src/app/api/notifications` | 1 |  | ✅ |
| `src/app/api/auth` | 1 |  | ✅ |

## <a id="admin"></a>🛠️ لوحة الإدارة

كل شاشات الإدارة: المحتوى، الاختبارات، المستخدمين، المنشئين، العمليات، الوظائف، SEO، التقارير، الفواتير. كل Server Action هون لازم يفحص الصلاحية.

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `src/app/admin/operations` | 12 |  | ✅ |
| `src/app/admin/academic` | 4 |  | ✅ |
| `src/app/admin/content` | 4 |  | ✅ |
| `src/app/admin/creators` | 7 |  | ✅ |
| `src/app/admin/reports` | 3 |  | ✅ |
| `src/app/admin` | 4 | صفحة الدخول، actions.ts (مفتاح الإدارة) | 🟡 1 🔵 1 |
| `src/app/admin/pipeline` | 3 |  | ✅ |
| `src/app/admin/_components` | 5 |  | ✅ |
| `src/app/admin/quizzes` | 3 |  | ✅ |
| `src/app/admin/seo` | 2 |  | ✅ |
| `src/app/admin/jobs` | 3 |  | ✅ |
| `src/app/admin/settings` | 2 |  | ✅ |
| `src/app/admin/billing` | 1 |  | ✅ |
| `src/app/admin/suggestions` | 2 |  | ✅ |
| `src/app/admin/users` | 1 |  | ✅ |
| `src/app/admin/changelog` | 1 |  | ✅ |
| `src/app/admin/diagnostics` | 1 |  | ✅ |
| `src/app/admin/roadmap` | 1 |  | ✅ |

## <a id="api"></a>🔌 خدمات API أخرى

نقاط API عامة للمراقبة وتقارير CSP.

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `src/app/api/monitoring` | 1 |  | ✅ |
| `src/app/api/csp-report` | 1 |  | ✅ |

## <a id="components"></a>🧩 ورشة المكونات

مكونات React المشتركة: الهيدر، عرض الدروس (Mdx)، الملعب، الاختبارات، البطاقات، الشهادات…

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `src/components` | 58 |  | ✅ |
| `src/components/certificate.css` | 1 |  | ✅ |
| `src/components/academic` | 2 |  | ✅ |

## <a id="pipeline"></a>🏭 خط استخراج المناهج

بيجمع خطط الجامعات من مصادر خارجية (Tavily/PDF)، بيستخرج المواد، وبيحطها بطابور مراجعة بشرية قبل النشر (factual-data-governance.md).

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `src/lib/curriculum/extraction` | 8 |  | ✅ |
| `src/lib/curriculum/jobs` | 3 |  | ✅ |
| `src/lib/curriculum/discovery` | 5 |  | ✅ |
| `src/lib/curriculum/collection` | 4 |  | ✅ |

## <a id="lib"></a>⚙️ غرفة المحرّك — المكتبات

منطق السيرفر: قراءة المحتوى، الصلاحيات (RBAC)، التقدّم والنقاط، الاختبارات، SEO، Stripe، التشفير، الـ rate limit، والمراقبة.

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `src/lib · قراءة المحتوى` | 11 |  | ✅ |
| `src/lib · إدارة وصلاحيات` | 16 |  | ✅ |
| `src/lib · تقدّم ونقاط` | 10 |  | ✅ |
| `src/lib · أمان ومراقبة` | 10 |  | 🔵 1 |
| `src/lib · متفرقات` | 4 |  | ✅ |
| `src/lib · أكاديمي` | 4 |  | ✅ |
| `src/lib · منشئو المحتوى` | 2 |  | ✅ |
| `src/lib · اختبارات وشهادات` | 4 |  | ✅ |
| `src/lib · وظائف` | 3 |  | ✅ |
| `src/lib · دفع وميزات` | 3 |  | ✅ |
| `src/lib · SEO وتحليلات` | 4 |  | ✅ |

## <a id="data"></a>🗄️ قبو البيانات

اتصال قاعدة البيانات (Neon + Drizzle)، الـ schema، وملفات الترحيل (migrations) المقفلة.

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `drizzle/meta` | 31 |  | ✅ |
| `src/db` | 13 | index.ts (الاتصال) + schema.ts (كل الجداول) | ✅ |
| `drizzle` | 31 | 30 ملف SQL مقفلة بـ lock — لا تعدّل القديم | ✅ |

## <a id="content"></a>📚 مستودع المحتوى

الدروس (MDX) لكل مسار، مقالات المدونة، المرجع، الاختبارات وبنك الأسئلة، خرائط الطريق، وبيانات الجامعات. كل محل هون = مسار أو نوع محتوى.

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `src/content/reference` | 35 | قسم JSON لكل تقنية | ✅ |
| `content/data` | 1 |  | ✅ |
| `src/content/tracks/ai-ml` | 66 |  | 🟠 1 🟡 17 🔵 21 |
| `src/content/blog` | 103 | 103 مقال MDX | 🟡 23 🔵 24 |
| `src/content/tracks/api-security` | 30 |  | 🟡 13 |
| `content/wave-1-drafts` | 123 | مسودات خارج src — مش منشورة | ✅ |
| `src/content/quiz-bank` | 36 |  | ✅ |
| `src/content/tracks/oop` | 29 |  | 🟡 7 |
| `src/content/tracks/microservices` | 30 |  | 🟡 19 🔵 11 |
| `src/content/tracks/java` | 49 |  | 🟡 25 |
| `src/content/quizzes` | 31 |  | ✅ |
| `src/content/tracks/javascript` | 37 |  | 🟡 9 |
| `src/content/tracks/nodejs` | 30 |  | 🟡 6 |
| `src/content/tracks/html` | 36 |  | 🟡 17 |
| `src/content/tracks/cpp` | 36 |  | 🟡 13 |
| `src/content/tracks/react` | 33 |  | 🟡 24 |
| `src/content/tracks/dsa` | 41 |  | 🟡 21 |
| `src/content/tracks/devops` | 33 |  | 🟡 6 🔵 3 |
| `src/content/tracks/php` | 30 |  | 🟡 15 |
| `src/content/tracks/django` | 37 |  | 🟡 26 |
| `src/content/tracks/laravel` | 30 |  | 🟡 15 |
| `src/content/tracks/css` | 31 |  | 🟡 7 🔵 1 |
| `src/content/tracks/python` | 31 |  | 🟡 10 |
| `src/content/tracks/go` | 32 |  | 🟡 22 |
| `src/content/tracks/flutter` | 32 |  | 🟡 20 |
| `src/content/tracks/typescript` | 29 |  | 🟡 12 |
| `src/content/tracks/rest-api` | 33 |  | 🟡 26 |
| `src/content/tracks/docker` | 32 |  | 🟡 17 |
| `src/content/tracks/linux` | 29 |  | 🟡 24 |
| `src/content/tracks/mongodb` | 32 |  | 🟡 34 |
| `src/content/tracks/sql` | 33 |  | 🟡 14 |
| `src/content/tracks/csharp` | 31 |  | 🟡 22 |
| `src/content/tracks/kubernetes` | 36 |  | 🟡 1 🔵 4 |
| `src/content/tracks/git` | 33 |  | 🟡 21 |
| `src/content/tracks/swift` | 30 |  | 🟡 23 |
| `src/content/tracks/aws` | 34 |  | 🔵 4 |
| `src/content/tracks/nextjs` | 29 |  | 🟡 24 |
| `src/content/tracks/cybersecurity` | 31 |  | ✅ |
| `src/content/tracks/c` | 31 |  | 🟡 24 |
| `src/content/tracks/rust` | 30 |  | 🟡 22 |
| `src/content/tracks/tailwind` | 30 |  | 🟡 33 |
| `src/content/tracks/kotlin` | 30 |  | 🟡 25 |
| `src/content/tracks/networking` | 29 |  | 🟠 1 🟡 7 |
| `src/content (root)` | 1 |  | ✅ |
| `src/content/tracks/terraform` | 16 |  | 🔵 3 |
| `src/content/academic-universities` | 22 |  | ✅ |
| `src/content/roadmaps` | 9 |  | ✅ |
| `src/content/academic` | 7 |  | ✅ |
| `src/content/tracks/software-testing` | 3 |  | 🔵 1 |
| `src/content/academic-study-plans` | 1 |  | ✅ |
| `src/content/tracks/redis` | 3 |  | ✅ |
| `src/content/tracks/dart` | 3 |  | 🔵 1 |
| `src/content/tracks/ruby` | 3 |  | ✅ |
| `src/content/tracks/web-performance` | 3 |  | ✅ |
| `src/content/tracks/postgresql` | 3 |  | 🔵 2 |
| `src/content/tracks/compilers` | 3 |  | ✅ |
| `src/content/tracks/powershell` | 2 |  | 🔵 1 |
| `src/content/tracks/system-design` | 2 |  | ✅ |
| `src/content/tracks/interview-prep` | 2 |  | ✅ |
| `src/content/tracks/mobile` | 2 |  | ✅ |
| … و2 مجلد ثاني | | | |

**📌 أهم الملاحظات هون:**

- 🟠 `src/content/tracks/ai-ml/102-llms-how-they-work.mdx:2` — نفس العنوان «كيف تعمل النماذج اللغوية الكبيرة (LLMs)؟» موجود كمان بـ src/content/blog/how-do-llms-work.mdx.
- 🟠 `src/content/tracks/networking/12-http-https.mdx:2` — نفس العنوان «HTTP و HTTPS» موجود كمان بـ src/content/tracks/networking/03-http.mdx.

## <a id="quality"></a>🧪 مختبر الجودة

سكربتات الفحص (check:*)، الاختبارات، وأدوات الفحص الجديدة (scripts/audit). هاي اللي بتمنع الأخطاء توصل للموقع.

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `tests` | 52 | node --test (يتطلب Node 24) | ✅ |
| `scripts` | 34 | check:* + ترحيل + أدوات إدارية | ✅ |
| `scripts/audit` | 10 | scan-code / scan-security / scan-content / scan-branches / build-map | ✅ |
| `run-ci.cmd` | 1 |  | ✅ |

## <a id="docs"></a>📖 المكتبة — التوثيق والقواعد

توثيق المشروع، سياسات المحتوى وSEO، قواعد Cursor، أوامر وskills الوكلاء.

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `rules` | 257 | 257 ملف .mdc | ✅ |
| `.claude/skills` | 147 |  | ✅ |
| `docs/content-backlog` | 3 |  | ✅ |
| `docs` | 29 |  | ✅ |
| `(root docs)` | 9 |  | ✅ |
| `docs/production-batches` | 13 |  | ✅ |
| `docs/project-map` | 2 | MAP.md + الصفحة التفاعلية | ✅ |
| `docs/repository-audit` | 7 |  | ✅ |
| `.claude/commands` | 6 |  | ✅ |
| `.claude` | 1 |  | ✅ |

## <a id="assets"></a>🖼️ المخزن — ملفات عامة

صور وملفات بتنخدم مباشرة (public/)، الشعار، وعامل Python (py-worker.js) للملعب.

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `public` | 9 | الشعار، py-worker.js، ملف تحقق Google | ✅ |
| `assets` | 2 |  | ✅ |

## <a id="other"></a>❔ متفرقات

ملفات ما إلها منطقة واضحة — مرشّحة للترتيب بـ v2.

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|

## 🌿 الفروع غير المدموجة

| الفرع | الحالة | ملفات متغيرة | آخر commit | ملاحظات |
|---|---|---:|---|---|
| `codex/fix-certificate-auth-loading` | فيه تعارض مع main | 2 | 2026-09-04 | 🔵 1 |
| `codex/remove-admin-pipeline-review` | فيه تعارض مع main | 6 | 2026-09-04 | 🔵 1 |
| `content/ai-ml-wave-7` | بيندمج بسهولة | 23 | 2026-09-20 | 🟡 4 🔵 2 |
| `content/api-security-refresh-2026-08-10` | فيه تعارض مع main | 2 | 2026-08-10 | 🟡 3 🔵 1 |
| `content/api-security-refresh-2026-08-31` | فيه تعارض مع main | 2 | 2026-08-31 | 🟡 1 🔵 1 |
| `content/api-security-refresh-2026-09-07` | فيه تعارض مع main | 3 | 2026-09-07 | 🟡 3 🔵 2 |
| `content/api-security-refresh-2026-09-14` | فيه تعارض مع main | 4 | 2026-09-14 | 🟡 2 🔵 1 |
| `content/c-refresh-2026-08-24` | بيندمج بسهولة | 1 | 2026-08-24 | 🔵 1 |
| `content/c-refresh-2026-09-07` | بيندمج بسهولة | 2 | 2026-09-07 | 🔵 1 |
| `content/cpp-refresh-2026-08-10` | فيه تعارض مع main | 2 | 2026-08-10 | 🔵 2 |
| `content/cpp-refresh-2026-09-07` | فيه تعارض مع main | 4 | 2026-09-07 | 🔵 2 |
| `content/csharp-refresh-2026-08-10` | فيه تعارض مع main | 4 | 2026-08-10 | 🔵 1 |
| `content/css-refresh-2026-07-27` | فيه تعارض مع main | 4 | 2026-07-27 | 🔵 1 |
| `content/css-refresh-2026-09-07` | فيه تعارض مع main | 4 | 2026-09-07 | 🔵 1 |
| `content/css-refresh-2026-09-14` | فيه تعارض مع main | 5 | 2026-09-14 | 🟡 1 🔵 2 |
| `content/cybersecurity-refresh-2026-08-24` | فيه تعارض مع main | 5 | 2026-08-24 | 🔵 1 |
| `content/cybersecurity-refresh-2026-09-07` | بيندمج بسهولة | 2 | 2026-09-07 | 🔵 1 |
| `content/devops-refresh-2026-09-07` | فيه تعارض مع main | 4 | 2026-09-07 | 🔵 2 |
| `content/devops-refresh-2026-09-14` | فيه تعارض مع main | 5 | 2026-09-14 | 🔵 3 |
| `content/django-refresh-2026-08-24` | فيه تعارض مع main | 4 | 2026-08-24 | 🔵 1 |
| `content/docker-refresh-2026-07-27` | فيه تعارض مع main | 3 | 2026-07-27 | 🔵 1 |
| `content/docker-refresh-2026-09-07` | بيندمج بسهولة | 2 | 2026-09-07 | 🔵 1 |
| `content/flutter-refresh-2026-08-24` | فيه تعارض مع main | 4 | 2026-08-24 | 🔵 1 |
| `content/flutter-refresh-2026-09-14` | فيه تعارض مع main | 4 | 2026-09-14 | 🔵 1 |
| `content/git-refresh-2026-09-07` | فيه تعارض مع main | 4 | 2026-09-07 | 🔵 1 |
| `content/go-refresh-2026-09-14` | فيه تعارض مع main | 4 | 2026-09-14 | 🔵 1 |
| `content/html-gap-fill-2026-09-01` | فيه تعارض مع main | 180 | 2026-09-04 | 🟡 8 🔵 7 |
| `content/html-refresh-2026-08-24` | فيه تعارض مع main | 3 | 2026-08-24 | 🔵 2 |
| `content/html-refresh-2026-08-31` | فيه تعارض مع main | 3 | 2026-08-31 | 🔵 2 |
| `content/html-refresh-2026-09-07` | بيندمج بسهولة | 2 | 2026-09-07 | 🔵 1 |
| `content/html-refresh-2026-09-14` | فيه تعارض مع main | 3 | 2026-09-14 | 🔵 1 |
| `content/javascript-refresh-2026-08-31` | فيه تعارض مع main | 7 | 2026-09-04 | 🔵 1 |
| `content/javascript-refresh-2026-09-14` | فيه تعارض مع main | 6 | 2026-09-14 | 🔵 1 |
| `content/kotlin-refresh-2026-09-14` | فيه تعارض مع main | 6 | 2026-09-14 | 🟡 1 🔵 1 |
| `content/laravel-refresh-2026-08-10` | فيه تعارض مع main | 3 | 2026-08-10 | 🔵 2 |
| `content/laravel-refresh-2026-08-31` | فيه تعارض مع main | 5 | 2026-09-04 | 🔵 1 |
| `content/laravel-refresh-2026-09-14` | فيه تعارض مع main | 3 | 2026-09-14 | 🟡 1 🔵 1 |
| `content/linux-refresh-2026-09-14` | فيه تعارض مع main | 2 | 2026-09-14 | 🔵 1 |
| `content/microservices-refresh-2026-08-31` | فيه تعارض مع main | 2 | 2026-09-04 | 🔵 1 |
| `content/mongodb-refresh-2026-08-10` | فيه تعارض مع main | 5 | 2026-08-10 | 🔵 1 |
| `content/networking-refresh-2026-08-31` | بيندمج بسهولة | 3 | 2026-09-04 | 🔵 1 |
| `content/networking-refresh-2026-09-14` | فيه تعارض مع main | 3 | 2026-09-14 | 🔵 1 |
| `content/nextjs-refresh-2026-08-10` | فيه تعارض مع main | 5 | 2026-08-10 | 🔵 1 |
| `content/nextjs-refresh-2026-08-31` | فيه تعارض مع main | 4 | 2026-09-04 | 🟡 3 🔵 1 |
| `content/nextjs-refresh-2026-09-14` | فيه تعارض مع main | 4 | 2026-09-14 | 🔵 1 |
| `content/nodejs-refresh-2026-08-31` | بيندمج بسهولة | 1 | 2026-09-04 | 🔵 1 |
| `content/react-refresh-2026-08-10` | فيه تعارض مع main | 4 | 2026-08-10 | 🔵 1 |
| `content/rest-api-refresh-2026-08-10` | فيه تعارض مع main | 5 | 2026-08-10 | 🔵 1 |
| `content/tailwind-refresh-2026-08-10` | بيندمج بسهولة | 1 | 2026-08-10 | 🔵 1 |
| `content/typescript-refresh-2026-08-10` | فيه تعارض مع main | 4 | 2026-08-10 | 🔵 1 |
| `docs/v2-repository-audit` | بيندمج بسهولة | 14 | 2026-10-16 | ✅ |
| `feature/content-creator-hub` | تاريخ منفصل | - | - | — |
| `refactor/phase-2-architecture` | بيندمج بسهولة | 35 | 2026-09-19 | ✅ |
| `worktree-phase-0-rate-limits` | فيه تعارض مع main | 9 | 2026-09-05 | 🔵 1 |

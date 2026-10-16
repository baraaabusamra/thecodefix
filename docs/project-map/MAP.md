# 🗺️ خريطة مشروع The Code Fix — V2

> زي خريطة المول: كل **منطقة** = حزمة أو وحدة أو جزء من المستودع، وكل **محل** = مجلد.
> النسخة التفاعلية: `docs/project-map/index.html` (بعد `npm run map`). هذا الملف مولَّد — لا تعدّله يدويًا.

**Commit:** `e76ceaa` · **ملفات:** 2679 · **ملاحظات الفحص:** 735

![خريطة المشروع](./FLOOR.svg)

## الطوابق

```
│ 📈 progress      │ 📝 assessment    │ 🎓 learning      │ 📚 content-tree  │
│ 🎨 creators      │ 🎬 media         │ 🏅 certificates  │ 📚 content-tree  │
│ 💼 jobs          │ 🏫 academic      │ 🏛️ web          │ 🏛️ web          │
│ 💬 feedback      │ 💳 billing       │ 🏛️ web          │ 🏛️ web          │
│ 📖 docs          │ 🧪 quality       │ 🛠️ admin        │ 🛠️ admin        │
│ 🧱 core          │ 🔐 identity      │ 🗄️ db           │ ⚙️ content       │
│ 🗃️ archive      │ 📜 contracts     │ 📡 observability │ 🧩 ui            │
│ 🚪 config        │ 🚪 config        │ 🚪 config        │ 🚪 config        │
```

| المنطقة | النوع | ملفات | أسطر | يعتمد على | ملاحظات |
|---|---|---:|---:|---|---|
| 🚪 [المدخل — إعدادات المستودع](#config) | بنية المستودع | 12 | 13,735 |  | 🟠 4 |
| 🧱 [إعدادات الموقع (@tcf/core)](#core) | حزمة أساس | 8 | 248 |  | 🔵 1 |
| 🗄️ [عميل قاعدة البيانات (@tcf/db)](#db) | حزمة أساس | 79 | 79,513 |  | ✅ لا شيء |
| 📡 [المراقبة (@tcf/observability)](#observability) | حزمة أساس | 7 | 450 |  | ✅ لا شيء |
| 🔐 [تسجيل الدخول (Auth.js) (@tcf/identity)](#identity) | حزمة أساس | 7 | 398 | core، db | 🟡 1 🔵 1 |
| ⚙️ [محرّك المحتوى (@tcf/content)](#content) | حزمة أساس | 16 | 1,676 | db | ✅ لا شيء |
| 🧩 [مكونات واجهة عامة قابلة لإعادة الاستخدام (@tcf/ui)](#ui) | حزمة أساس | 14 | 480 | core، observability | ✅ لا شيء |
| 📜 [عقود الـ API (zod) المشتركة بين الويب والموبايل (@tcf/contracts)](#contracts) | حزمة أساس | 2 | 91 |  | ✅ لا شيء |
| 🎓 [تجربة الدرس: العرض (@tcf/learning)](#learning) | وحدة ميزة | 17 | 1,242 | content، core، observability، progress | ✅ لا شيء |
| 📈 [التقدّم (@tcf/progress)](#progress) | وحدة ميزة | 16 | 1,883 | content، core، db، identity، observability، ui | ✅ لا شيء |
| 📝 [اختبارات التدريب (@tcf/assessment)](#assessment) | وحدة ميزة | 13 | 1,839 | content، core، db، identity، observability، progress | ✅ لا شيء |
| 🏅 [إصدار الشهادات والتحقق منها (@tcf/certificates)](#certificates) | وحدة ميزة | 8 | 1,495 | assessment، content، core، db، identity، observability، progress | ✅ لا شيء |
| 💳 [الاشتراكات والدفع (Stripe) (@tcf/billing)](#billing) | وحدة ميزة | 5 | 372 | db، observability | ✅ لا شيء |
| 🎨 [مركز منشئي المحتوى (@tcf/creators)](#creators) | وحدة ميزة | 23 | 2,215 | core، db، identity | ✅ لا شيء |
| 🏫 [الجامعات (@tcf/academic)](#academic) | وحدة ميزة | 30 | 3,702 | content، core، db، identity، jobs | ✅ لا شيء |
| 💼 [الوظائف والتدريب وتنبيهات الوظائف (@tcf/jobs)](#jobs) | وحدة ميزة | 10 | 736 | content، core، db، identity، observability، ui | 🔵 1 |
| 💬 [اقتراحات الزوار (@tcf/feedback)](#feedback) | وحدة ميزة | 5 | 303 | core، db، identity | ✅ لا شيء |
| 🎬 [الفيديو: مزوّدات الاستضافة وتتبّع المشاهدة (جديد) (@tcf/media)](#media) | وحدة ميزة | 6 | 210 | content | ✅ لا شيء |
| 🛠️ [لوحة الإدارة: العمليات (@tcf/admin)](#admin) | وحدة ميزة | 18 | 2,377 | assessment، content، core، db، identity، progress | ✅ لا شيء |
| 🏛️ [الساحة المركزية — الموقع (apps/web)](#web) | تطبيق | 145 | 15,897 | academic، admin، assessment، billing، certificates، content، contracts، core، creators، db، feedback، identity، jobs، learning، observability، progress، ui | 🟠 1 🟡 4 |
| 📚 [مستودع المحتوى (content/)](#content-tree) | بيانات | 1653 | 184,143 |  | 🟠 2 🟡 644 🔵 76 |
| 🧪 [مختبر الجودة — السكربتات والاختبارات](#quality) | بنية المستودع | 104 | 16,408 |  | ✅ لا شيء |
| 📖 [المكتبة — التوثيق والقواعد](#docs) | بنية المستودع | 474 | 66,745 |  | ✅ لا شيء |
| 🗃️ [الأرشيف](#archive) | بنية المستودع | 7 | 507 |  | ✅ لا شيء |

## <a id="config"></a>🚪 المدخل — إعدادات المستودع

package.json الجذري (workspaces)، turbo.json، tsconfig، ESLint، CI. من هون بيبلش كل إشي.

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `(root)` | 10 | package.json (workspaces)، turbo.json، tsconfig.base/tsconfig، eslint | 🟠 4 |
| `.github` | 2 | GitHub Actions: CI على كل push وPR | ✅ لا شيء |

**📌 أهم الملاحظات هون:**

- 🟠 `package-lock.json:4299` — مكتبة argparse (1.0.0 - 1.0.10) فيها ثغرة معروفة: advisory — عبر مكتبة ثانية.
- 🟠 `package-lock.json:6932` — مكتبة gray-matter (>=2.0.2) فيها ثغرة معروفة: advisory.
- 🟠 `package-lock.json:7942` — مكتبة js-yaml (3.2.7 - 3.15.2) فيها ثغرة معروفة: advisory — عبر مكتبة ثانية.
- 🟠 `package-lock.json:11271` — مكتبة sprintf-js (*) فيها ثغرة معروفة: sprintf-js vulnerable to denial of service through unbounded precision specifiers — عبر مكتبة ثانية.

## <a id="core"></a>🧱 إعدادات الموقع (@tcf/core)

حزمة أساس · إعدادات الموقع، الأعلام، التحقق، التشفير، الـ rate limit

📄 التفاصيل: [`packages/core/README.md`](../../packages/core/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `packages/core/src` | 7 |  | 🔵 1 |
| `packages/core (package)` | 1 |  | ✅ لا شيء |

## <a id="db"></a>🗄️ عميل قاعدة البيانات (@tcf/db)

حزمة أساس · عميل قاعدة البيانات، الـ Schema المقسّم، الترحيلات

📄 التفاصيل: [`packages/db/README.md`](../../packages/db/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `packages/db/drizzle` | 62 | 30 ملف SQL مقفلة — لا تعدّل القديم أبدًا | ✅ لا شيء |
| `packages/db/src/schema` | 11 | 11 ملف، بدون أي تغيير SQL عن V1 | ✅ لا شيء |
| `packages/db/src` | 4 |  | ✅ لا شيء |
| `packages/db (package)` | 2 |  | ✅ لا شيء |

## <a id="observability"></a>📡 المراقبة (@tcf/observability)

حزمة أساس · المراقبة، تقارير CSP، أحداث التحليلات

📄 التفاصيل: [`packages/observability/README.md`](../../packages/observability/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `packages/observability/src` | 6 |  | ✅ لا شيء |
| `packages/observability (package)` | 1 |  | ✅ لا شيء |

## <a id="identity"></a>🔐 تسجيل الدخول (Auth.js) (@tcf/identity)

حزمة أساس · تسجيل الدخول (Auth.js)، الأدوار والصلاحيات، بوابة الإدارة

📄 التفاصيل: [`packages/identity/README.md`](../../packages/identity/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `packages/identity/src` | 5 |  | ✅ لا شيء |
| `packages/identity/src/actions` | 1 |  | 🟡 1 🔵 1 |
| `packages/identity (package)` | 1 |  | ✅ لا شيء |

## <a id="content"></a>⚙️ محرّك المحتوى (@tcf/content)

حزمة أساس · محرّك المحتوى: المسارات، الدروس، المدونة، المرجع، اللغات

📄 التفاصيل: [`packages/content/README.md`](../../packages/content/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `packages/content/src` | 13 |  | ✅ لا شيء |
| `packages/content/src/admin` | 2 |  | ✅ لا شيء |
| `packages/content (package)` | 1 |  | ✅ لا شيء |

## <a id="ui"></a>🧩 مكونات واجهة عامة قابلة لإعادة الاستخدام (@tcf/ui)

حزمة أساس · مكونات واجهة عامة قابلة لإعادة الاستخدام

📄 التفاصيل: [`packages/ui/README.md`](../../packages/ui/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `packages/ui/src/ui` | 13 |  | ✅ لا شيء |
| `packages/ui (package)` | 1 |  | ✅ لا شيء |

## <a id="contracts"></a>📜 عقود الـ API (zod) المشتركة بين الويب والموبايل (@tcf/contracts)

حزمة أساس · عقود الـ API (zod) المشتركة بين الويب والموبايل

📄 التفاصيل: [`packages/contracts/README.md`](../../packages/contracts/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `packages/contracts/src` | 1 |  | ✅ لا شيء |
| `packages/contracts (package)` | 1 |  | ✅ لا شيء |

## <a id="learning"></a>🎓 تجربة الدرس: العرض (@tcf/learning)

وحدة ميزة · تجربة الدرس: العرض، الملعب، المفضلة، آخر زيارة

📄 التفاصيل: [`modules/learning/README.md`](../../modules/learning/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `modules/learning/src/ui` | 15 |  | ✅ لا شيء |
| `modules/learning/src` | 1 |  | ✅ لا شيء |
| `modules/learning (package)` | 1 |  | ✅ لا شيء |

## <a id="progress"></a>📈 التقدّم (@tcf/progress)

وحدة ميزة · التقدّم، النقاط، الإنجازات، لوحة المتصدرين، لوحة الحساب

📄 التفاصيل: [`modules/progress/README.md`](../../modules/progress/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `modules/progress/src/ui` | 5 |  | ✅ لا شيء |
| `modules/progress/src` | 9 |  | ✅ لا شيء |
| `modules/progress/src/actions` | 1 |  | ✅ لا شيء |
| `modules/progress (package)` | 1 |  | ✅ لا شيء |

## <a id="assessment"></a>📝 اختبارات التدريب (@tcf/assessment)

وحدة ميزة · اختبارات التدريب، بنك الأسئلة، الامتحان النهائي

📄 التفاصيل: [`modules/assessment/README.md`](../../modules/assessment/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `modules/assessment/src/actions` | 3 |  | ✅ لا شيء |
| `modules/assessment/src/ui` | 4 |  | ✅ لا شيء |
| `modules/assessment/src` | 4 |  | ✅ لا شيء |
| `modules/assessment/src/admin` | 1 |  | ✅ لا شيء |
| `modules/assessment (package)` | 1 |  | ✅ لا شيء |

## <a id="certificates"></a>🏅 إصدار الشهادات والتحقق منها (@tcf/certificates)

وحدة ميزة · إصدار الشهادات والتحقق منها

📄 التفاصيل: [`modules/certificates/README.md`](../../modules/certificates/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `modules/certificates/src/ui` | 5 |  | ✅ لا شيء |
| `modules/certificates/src/actions` | 1 |  | ✅ لا شيء |
| `modules/certificates/src` | 1 |  | ✅ لا شيء |
| `modules/certificates (package)` | 1 |  | ✅ لا شيء |

## <a id="billing"></a>💳 الاشتراكات والدفع (Stripe) (@tcf/billing)

وحدة ميزة · الاشتراكات والدفع (Stripe)

📄 التفاصيل: [`modules/billing/README.md`](../../modules/billing/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `modules/billing/src` | 2 |  | ✅ لا شيء |
| `modules/billing/src/admin` | 1 |  | ✅ لا شيء |
| `modules/billing/src/ui` | 1 |  | ✅ لا شيء |
| `modules/billing (package)` | 1 |  | ✅ لا شيء |

## <a id="creators"></a>🎨 مركز منشئي المحتوى (@tcf/creators)

وحدة ميزة · مركز منشئي المحتوى

📄 التفاصيل: [`modules/creators/README.md`](../../modules/creators/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `modules/creators/src/ui` | 13 |  | ✅ لا شيء |
| `modules/creators/src/actions` | 7 |  | ✅ لا شيء |
| `modules/creators/src` | 2 |  | ✅ لا شيء |
| `modules/creators (package)` | 1 |  | ✅ لا شيء |

## <a id="academic"></a>🏫 الجامعات (@tcf/academic)

وحدة ميزة · الجامعات، الخطط الدراسية، خط استخراج المناهج

📄 التفاصيل: [`modules/academic/README.md`](../../modules/academic/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `modules/academic/src/pipeline` | 20 |  | ✅ لا شيء |
| `modules/academic/src` | 5 |  | ✅ لا شيء |
| `modules/academic/src/ui` | 2 |  | ✅ لا شيء |
| `modules/academic/src/actions` | 2 |  | ✅ لا شيء |
| `modules/academic (package)` | 1 |  | ✅ لا شيء |

## <a id="jobs"></a>💼 الوظائف والتدريب وتنبيهات الوظائف (@tcf/jobs)

وحدة ميزة · الوظائف والتدريب وتنبيهات الوظائف

📄 التفاصيل: [`modules/jobs/README.md`](../../modules/jobs/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `modules/jobs/src` | 3 |  | ✅ لا شيء |
| `modules/jobs/src/ui` | 3 |  | ✅ لا شيء |
| `modules/jobs/src/actions` | 2 |  | 🔵 1 |
| `modules/jobs/src/admin` | 1 |  | ✅ لا شيء |
| `modules/jobs (package)` | 1 |  | ✅ لا شيء |

## <a id="feedback"></a>💬 اقتراحات الزوار (@tcf/feedback)

وحدة ميزة · اقتراحات الزوار

📄 التفاصيل: [`modules/feedback/README.md`](../../modules/feedback/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `modules/feedback/src/ui` | 1 |  | ✅ لا شيء |
| `modules/feedback/src/actions` | 2 |  | ✅ لا شيء |
| `modules/feedback (package)` | 1 |  | ✅ لا شيء |
| `modules/feedback/src/admin` | 1 |  | ✅ لا شيء |

## <a id="media"></a>🎬 الفيديو: مزوّدات الاستضافة وتتبّع المشاهدة (جديد) (@tcf/media)

وحدة ميزة · الفيديو: مزوّدات الاستضافة وتتبّع المشاهدة (جديد)

📄 التفاصيل: [`modules/media/README.md`](../../modules/media/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `modules/media/src` | 2 |  | ✅ لا شيء |
| `modules/media/src/providers` | 2 |  | ✅ لا شيء |
| `modules/media/src/ui` | 1 |  | ✅ لا شيء |
| `modules/media (package)` | 1 |  | ✅ لا شيء |

## <a id="admin"></a>🛠️ لوحة الإدارة: العمليات (@tcf/admin)

وحدة ميزة · لوحة الإدارة: العمليات، التقارير، المستخدمين، SEO

📄 التفاصيل: [`modules/admin/README.md`](../../modules/admin/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `modules/admin/src` | 8 |  | ✅ لا شيء |
| `modules/admin/src/actions` | 8 |  | ✅ لا شيء |
| `modules/admin/src/ui` | 1 |  | ✅ لا شيء |
| `modules/admin (package)` | 1 |  | ✅ لا شيء |

## <a id="web"></a>🏛️ الساحة المركزية — الموقع (apps/web)

تطبيق · موقع thecodefix.net (Next.js)

📄 التفاصيل: [`apps/web/README.md`](../../apps/web/README.md)

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `apps/web/src/app/admin` | 43 | كل صفحة تفحص صلاحيتها بنفسها | ✅ لا شيء |
| `apps/web/src/app (root)` | 11 | layout.tsx، الصفحة الرئيسية، sitemap، robots، صفحات الخطأ | ✅ لا شيء |
| `apps/web/src/app/academic` | 7 |  | ✅ لا شيء |
| `apps/web/src/shell` | 11 | الهيدر، الفوتر، القوائم، لوحة الأوامر | ✅ لا شيء |
| `apps/web/src/app/learn` | 5 | /learn ← /learn/[tech] ← /learn/[tech]/[lesson] | ✅ لا شيء |
| `apps/web/src/app/api` | 11 | auth، checkout، stripe webhook، csp-report، و/api/v1 للموبايل | 🟡 3 |
| `apps/web/src/app/creators` | 11 |  | ✅ لا شيء |
| `apps/web (config)` | 15 |  | 🟠 1 🟡 1 |
| `apps/web/src/app/reference` | 3 |  | ✅ لا شيء |
| `apps/web/src/app/jobs` | 2 |  | ✅ لا شيء |
| `apps/web/src/app/blog` | 4 |  | ✅ لا شيء |
| `apps/web/src/app/roadmaps` | 2 |  | ✅ لا شيء |
| `apps/web/src/app/training` | 2 |  | ✅ لا شيء |
| `apps/web/src/app/quiz` | 1 |  | ✅ لا شيء |
| `apps/web/src/app/verify` | 2 |  | ✅ لا شيء |
| `apps/web/src/app/login` | 2 |  | ✅ لا شيء |
| `apps/web/src/app/playground` | 1 |  | ✅ لا شيء |
| `apps/web/src/app/privacy` | 1 |  | ✅ لا شيء |
| `apps/web/src/app/pricing` | 1 |  | ✅ لا شيء |
| `apps/web/src/app/terms` | 1 |  | ✅ لا شيء |
| `apps/web/src/server` | 1 | طبقة /api/v1 | ✅ لا شيء |
| `apps/web/src/app/leaderboard` | 1 |  | ✅ لا شيء |
| `apps/web/src/app/certificate` | 1 |  | ✅ لا شيء |
| `apps/web/src/app/about` | 1 |  | ✅ لا شيء |
| `apps/web/src/app/contact` | 1 |  | ✅ لا شيء |
| `apps/web/src/app/search` | 1 |  | ✅ لا شيء |
| `apps/web/src/app/account` | 1 |  | ✅ لا شيء |
| `apps/web/src/instrumentation` | 1 |  | ✅ لا شيء |
| `apps/web/src/types` | 1 |  | ✅ لا شيء |

**📌 أهم الملاحظات هون:**

- 🟠 `apps/web/next.config.ts:40` — الـ CSP شغّال بوضع Report-Only بس — بيسجّل المخالفات بدون ما يمنعها.

## <a id="content-tree"></a>📚 مستودع المحتوى (content/)

الدروس والمقالات والمرجع والاختبارات لكل لغة (content/ar، content/en لاحقًا)، والبيانات المحايدة لغويًا (content/data). كل محل = مسار أو نوع محتوى.

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `content/data` | 2 |  | ✅ لا شيء |
| `content/ar/reference` | 35 | قسم JSON لكل تقنية | ✅ لا شيء |
| `content/ar/tracks/ai-ml` | 66 |  | 🟠 1 🟡 17 🔵 21 |
| `content/ar/blog` | 103 | 103 مقال MDX | 🟡 23 🔵 24 |
| `content/ar/tracks/api-security` | 30 |  | 🟡 13 |
| `content/_drafts/wave-1` | 123 | غير منشورة | ✅ لا شيء |
| `content/ar/quiz-bank` | 36 | سري — لا يصل للمتصفح أبدًا | ✅ لا شيء |
| `content/ar/tracks/oop` | 29 |  | 🟡 7 |
| `content/ar/tracks/microservices` | 30 |  | 🟡 19 🔵 11 |
| `content/ar/tracks/java` | 49 |  | 🟡 25 |
| `content/ar/quizzes` | 31 |  | ✅ لا شيء |
| `content/ar/tracks/javascript` | 37 |  | 🟡 9 |
| `content/ar/tracks/nodejs` | 30 |  | 🟡 6 |
| `content/ar/tracks/html` | 36 |  | 🟡 17 |
| `content/ar/tracks/cpp` | 36 |  | 🟡 13 |
| `content/ar/tracks/react` | 33 |  | 🟡 24 |
| `content/ar/tracks/dsa` | 41 |  | 🟡 21 |
| `content/ar/tracks/devops` | 33 |  | 🟡 6 🔵 3 |
| `content/ar/tracks/php` | 30 |  | 🟡 15 |
| `content/ar/tracks/django` | 37 |  | 🟡 26 |
| `content/ar/tracks/laravel` | 30 |  | 🟡 15 |
| `content/ar/tracks/css` | 31 |  | 🟡 7 🔵 1 |
| `content/ar/tracks/python` | 31 |  | 🟡 10 |
| `content/ar/tracks/go` | 32 |  | 🟡 22 |
| `content/ar/tracks/flutter` | 32 |  | 🟡 20 |
| `content/ar/tracks/typescript` | 29 |  | 🟡 12 |
| `content/ar/tracks/rest-api` | 33 |  | 🟡 26 |
| `content/ar/tracks/docker` | 32 |  | 🟡 17 |
| `content/ar/tracks/linux` | 29 |  | 🟡 24 |
| `content/ar/tracks/mongodb` | 32 |  | 🟡 34 |
| `content/ar/tracks/sql` | 33 |  | 🟡 14 |
| `content/ar/tracks/csharp` | 31 |  | 🟡 22 |
| `content/ar/tracks/kubernetes` | 36 |  | 🟡 1 🔵 4 |
| `content/ar/tracks/git` | 33 |  | 🟡 21 |
| `content/ar/tracks/swift` | 30 |  | 🟡 23 |
| `content/ar/tracks/aws` | 34 |  | 🔵 4 |
| `content/ar/tracks/nextjs` | 29 |  | 🟡 24 |
| `content/ar/tracks/cybersecurity` | 31 |  | ✅ لا شيء |
| `content/ar/tracks/c` | 31 |  | 🟡 24 |
| `content/ar/tracks/rust` | 30 |  | 🟡 22 |
| … و21 مجلد ثاني | | | |

**📌 أهم الملاحظات هون:**

- 🟠 `content/ar/tracks/ai-ml/102-llms-how-they-work.mdx:2` — نفس العنوان «كيف تعمل النماذج اللغوية الكبيرة (LLMs)؟» موجود كمان بـ content/ar/blog/how-do-llms-work.mdx.
- 🟠 `content/ar/tracks/networking/12-http-https.mdx:2` — نفس العنوان «HTTP و HTTPS» موجود كمان بـ content/ar/tracks/networking/03-http.mdx.

## <a id="quality"></a>🧪 مختبر الجودة — السكربتات والاختبارات

فحوصات المحتوى وSEO (check:*)، الاختبارات، أدوات الخريطة والفحص (scripts/audit)، أدوات الانتقال لـ V2 (scripts/v2).

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `tests` | 52 | node --test عبر tsx (Node 24) | ✅ لا شيء |
| `scripts` | 33 |  | ✅ لا شيء |
| `scripts/audit` | 10 | scan-code / scan-security / scan-content / scan-branches / build-map / where | ✅ لا شيء |
| `scripts/v2` | 4 | layout (خريطة الانتقال)، restructure، mv، workspaces، port-branch، new-module | ✅ لا شيء |
| `tests/helpers` | 3 |  | ✅ لا شيء |
| `scripts/lib` | 1 |  | ✅ لا شيء |
| `scripts/ci` | 1 |  | ✅ لا شيء |

## <a id="docs"></a>📖 المكتبة — التوثيق والقواعد

معمارية V2 وقراراتها (docs/v2)، سياسات المحتوى وSEO، قواعد Cursor، أوامر وskills الوكلاء.

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `rules` | 257 |  | ✅ لا شيء |
| `.claude/skills` | 147 |  | ✅ لا شيء |
| `docs/content-backlog` | 3 |  | ✅ لا شيء |
| `docs` | 29 |  | ✅ لا شيء |
| `(root docs)` | 9 |  | ✅ لا شيء |
| `docs/production-batches` | 13 |  | ✅ لا شيء |
| `docs/project-map` | 2 | MAP.md + الصفحة التفاعلية | ✅ لا شيء |
| `docs/repository-audit` | 7 |  | ✅ لا شيء |
| `.claude/commands` | 6 |  | ✅ لا شيء |
| `.claude` | 1 |  | ✅ لا شيء |

## <a id="archive"></a>🗃️ الأرشيف

كود V1 غير مستخدم محفوظ للمراجعة (غير مُترجم).

| المحل (مجلد) | ملفات | شو فيه | ملاحظات |
|---|---:|---|---|
| `archive/v1-unreferenced` | 2 |  | ✅ لا شيء |
| `screenshot/2.PNG` | 1 |  | ✅ لا شيء |
| `screenshot/3.PNG` | 1 |  | ✅ لا شيء |
| `screenshot/4.PNG` | 1 |  | ✅ لا شيء |
| `screenshot/6.PNG` | 1 |  | ✅ لا شيء |
| `screenshot/Capture.PNG` | 1 |  | ✅ لا شيء |

## 🌿 الفروع غير المدموجة

| الفرع | الحالة | ملفات | آخر commit | ملاحظات |
|---|---|---:|---|---|
| `codex/fix-certificate-auth-loading` | فيه تعارض | 2 | 2026-09-04 | 🔵 1 |
| `codex/remove-admin-pipeline-review` | فيه تعارض | 6 | 2026-09-04 | 🔵 1 |
| `content/ai-ml-wave-7` | بيندمج | 23 | 2026-09-20 | 🟡 4 🔵 2 |
| `content/api-security-refresh-2026-08-10` | فيه تعارض | 2 | 2026-08-10 | 🟡 3 🔵 1 |
| `content/api-security-refresh-2026-08-31` | فيه تعارض | 2 | 2026-08-31 | 🟡 1 🔵 1 |
| `content/api-security-refresh-2026-09-07` | فيه تعارض | 3 | 2026-09-07 | 🟡 3 🔵 2 |
| `content/api-security-refresh-2026-09-14` | فيه تعارض | 4 | 2026-09-14 | 🟡 2 🔵 1 |
| `content/c-refresh-2026-08-24` | بيندمج | 1 | 2026-08-24 | 🔵 1 |
| `content/c-refresh-2026-09-07` | بيندمج | 2 | 2026-09-07 | 🔵 1 |
| `content/cpp-refresh-2026-08-10` | فيه تعارض | 2 | 2026-08-10 | 🔵 2 |
| `content/cpp-refresh-2026-09-07` | فيه تعارض | 4 | 2026-09-07 | 🔵 2 |
| `content/csharp-refresh-2026-08-10` | فيه تعارض | 4 | 2026-08-10 | 🔵 1 |
| `content/css-refresh-2026-07-27` | فيه تعارض | 4 | 2026-07-27 | 🔵 1 |
| `content/css-refresh-2026-09-07` | فيه تعارض | 4 | 2026-09-07 | 🔵 1 |
| `content/css-refresh-2026-09-14` | فيه تعارض | 5 | 2026-09-14 | 🟡 1 🔵 2 |
| `content/cybersecurity-refresh-2026-08-24` | فيه تعارض | 5 | 2026-08-24 | 🔵 1 |
| `content/cybersecurity-refresh-2026-09-07` | بيندمج | 2 | 2026-09-07 | 🔵 1 |
| `content/devops-refresh-2026-09-07` | فيه تعارض | 4 | 2026-09-07 | 🔵 2 |
| `content/devops-refresh-2026-09-14` | فيه تعارض | 5 | 2026-09-14 | 🔵 3 |
| `content/django-refresh-2026-08-24` | فيه تعارض | 4 | 2026-08-24 | 🔵 1 |
| `content/docker-refresh-2026-07-27` | فيه تعارض | 3 | 2026-07-27 | 🔵 1 |
| `content/docker-refresh-2026-09-07` | بيندمج | 2 | 2026-09-07 | 🔵 1 |
| `content/flutter-refresh-2026-08-24` | فيه تعارض | 4 | 2026-08-24 | 🔵 1 |
| `content/flutter-refresh-2026-09-14` | فيه تعارض | 4 | 2026-09-14 | 🔵 1 |
| `content/git-refresh-2026-09-07` | فيه تعارض | 4 | 2026-09-07 | 🔵 1 |
| `content/go-refresh-2026-09-14` | فيه تعارض | 4 | 2026-09-14 | 🔵 1 |
| `content/html-gap-fill-2026-09-01` | فيه تعارض | 180 | 2026-09-04 | 🟡 8 🔵 7 |
| `content/html-refresh-2026-08-24` | فيه تعارض | 3 | 2026-08-24 | 🔵 2 |
| `content/html-refresh-2026-08-31` | فيه تعارض | 3 | 2026-08-31 | 🔵 2 |
| `content/html-refresh-2026-09-07` | بيندمج | 2 | 2026-09-07 | 🔵 1 |
| `content/html-refresh-2026-09-14` | فيه تعارض | 3 | 2026-09-14 | 🔵 1 |
| `content/javascript-refresh-2026-08-31` | فيه تعارض | 7 | 2026-09-04 | 🔵 1 |
| `content/javascript-refresh-2026-09-14` | فيه تعارض | 6 | 2026-09-14 | 🔵 1 |
| `content/kotlin-refresh-2026-09-14` | فيه تعارض | 6 | 2026-09-14 | 🟡 1 🔵 1 |
| `content/laravel-refresh-2026-08-10` | فيه تعارض | 3 | 2026-08-10 | 🔵 2 |
| `content/laravel-refresh-2026-08-31` | فيه تعارض | 5 | 2026-09-04 | 🔵 1 |
| `content/laravel-refresh-2026-09-14` | فيه تعارض | 3 | 2026-09-14 | 🟡 1 🔵 1 |
| `content/linux-refresh-2026-09-14` | فيه تعارض | 2 | 2026-09-14 | 🔵 1 |
| `content/microservices-refresh-2026-08-31` | فيه تعارض | 2 | 2026-09-04 | 🔵 1 |
| `content/mongodb-refresh-2026-08-10` | فيه تعارض | 5 | 2026-08-10 | 🔵 1 |
| `content/networking-refresh-2026-08-31` | بيندمج | 3 | 2026-09-04 | 🔵 1 |
| `content/networking-refresh-2026-09-14` | فيه تعارض | 3 | 2026-09-14 | 🔵 1 |
| `content/nextjs-refresh-2026-08-10` | فيه تعارض | 5 | 2026-08-10 | 🔵 1 |
| `content/nextjs-refresh-2026-08-31` | فيه تعارض | 4 | 2026-09-04 | 🟡 3 🔵 1 |
| `content/nextjs-refresh-2026-09-14` | فيه تعارض | 4 | 2026-09-14 | 🔵 1 |
| `content/nodejs-refresh-2026-08-31` | بيندمج | 1 | 2026-09-04 | 🔵 1 |
| `content/react-refresh-2026-08-10` | فيه تعارض | 4 | 2026-08-10 | 🔵 1 |
| `content/rest-api-refresh-2026-08-10` | فيه تعارض | 5 | 2026-08-10 | 🔵 1 |
| `content/tailwind-refresh-2026-08-10` | بيندمج | 1 | 2026-08-10 | 🔵 1 |
| `content/typescript-refresh-2026-08-10` | فيه تعارض | 4 | 2026-08-10 | 🔵 1 |
| `docs/v2-repository-audit` | بيندمج | 14 | 2026-10-16 | ✅ لا شيء |
| `feature/content-creator-hub` | تاريخ منفصل | - | - | — |
| `refactor/phase-2-architecture` | بيندمج | 35 | 2026-09-19 | ✅ لا شيء |
| `worktree-phase-0-rate-limits` | فيه تعارض | 9 | 2026-09-05 | 🔵 1 |

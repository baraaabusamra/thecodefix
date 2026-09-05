# 📘 The Code Fix — التوثيق الشامل للمشروع

> المرجع الكامل: ما هو المشروع، كيف يعمل، ممّ يتكوّن، وكيف تُدار كل أجزائه.
> آخر تحديث: **2026-09-05** (تدقيق أرقام مباشرة من الريبو — راجع الملاحظة في
> نهاية القسم 2). (الخطة المستقبلية في [ROADMAP.md](ROADMAP.md))
>
> ⚠️ نسخة يوليو 2026 من هذا الملف كانت تذكر 31 مسارًا/768 درسًا/8 أقسام إدارة/
> 14 جدول قاعدة بيانات — هذه الأرقام **قديمة ولم تعد صحيحة**، استُبدلت أدناه.

---

## 1) ما هو The Code Fix؟

**المنصّة العربية التفاعلية لتعلّم البرمجة** — "W3Schools بالعربي" وأكثر:
دروس شاملة + محرّر أكواد تفاعلي + اختبارات + شهادات قابلة للتحقّق + خرائط طريق
مهنية + مدوّنة + لوحة وظائف — كلّها عربية RTL، مجانية بالكامل، ومبنية بهوية
بصرية نيون مميّزة (بنفسجي `#B026FF` + سماوي `#00F5FF`، داكن افتراضيًا).

| | |
|---|---|
| **الموقع** | https://thecodefix.net (canonical) |
| **الريبو** | https://github.com/baraaabusamra/thecodefix (خاص) |
| **الاستضافة** | Vercel — نشر تلقائي مع كل push إلى `main` |
| **قاعدة البيانات** | Neon Postgres (serverless) عبر Vercel Marketplace |
| **لوحة Vercel** | https://vercel.com/thecodefix/thecodefix |

## 2) الأرقام الحالية (2026-09-05)

- **51 مسارًا** تعليميًّا (A-Z) — **1,164 درسًا** (`.mdx`)
- **31 اختبارًا** — تغطّي المسارات الـ31 الأصلية فقط؛ **20 مسارًا أُضيفت لاحقًا
  (موجة إنتاج المحتوى أغسطس 2026 — AWS، Kubernetes، Terraform، وغيرها) ما زالت
  بدون اختبار خاص بها** (راجع `src/content/quizzes/` مقابل `src/content/tracks/`).
- **90 مقالة** مدوّنة — منها **~40 مقالة مقارنة** ("X مقابل Y") و**~23 مقالة**
  ضمن عنقود حلّ الأخطاء الشائعة (عدّ تقريبي حسب اسم الملف، لا حقل تصنيف رسمي
  بالمحتوى بعد).
- **9 خرائط طريق** مهنية.
- **34 قسمًا مرجعيًّا** (`src/content/reference/*.json`) تضمّ **752 مدخلًا**.
- **3,853 صفحة** وُلدت بنجاح (`3853/3853`) في بناء إنتاج محلي كامل بتاريخ
  2026-09-05 ضمن `run-ci.cmd`. اكتمل بعده lint بنجاح؛ صفحات الدروس والمسارات
  والاختبارات بقيت static/SSG كما هو مقصود، ولم تحوّل CSP Report-Only القوالب
  العامة إلى dynamic rendering.
- **40 جدولًا** بقاعدة البيانات (`src/db/schema.ts`)، **27 migration** —
  نمت من 14 جدولًا/7 migrations نتيجة أنظمة أضيفت لاحقًا: خط أنابيب استخراج
  المناهج (`pipeline*`، 12 جدولًا)، العمليات/الدعم (`instructor*`, `ticket*`,
  `work_reports`, `outreach_contacts`)، المبدعون (`creator`, `post`)،
  والتقييم (`lesson_quiz_attempts`, `exam_attempts`, `league_snapshots`,
  `job_alerts`, `notification`). التفاصيل الكاملة لخط أنابيب المناهج في
  [`curriculum-pipeline-audit.md`](curriculum-pipeline-audit.md) و
  [`factual-data-governance.md`](factual-data-governance.md) (يملكهما مسار
  عمل منفصل — غير مُعدَّلين هنا).

**التحقّق (منهجية):** كل رقم أعلاه عن المحتوى مأخوذ مباشرة بأمر `find`/`ls` أو
سكربت Node بسيط يعدّ عناصر JSON بتاريخ 2026-09-04، وليس منسوخًا من نسخة سابقة
من هذا الملف. عدد صفحات الـ build مأخوذ من مخرجات `next build` الفعلية
الناجحة. أرقام DB من عدّ `pgTable(` بـ`schema.ts` وملفات
`drizzle/*.sql`. رقم sitemap الحي الحالي (2,641 رابطًا، رابط تخصّص أكاديمي
واحد فقط) بتاريخ 2026-09-05، بعد تفعيل والتحقّق من بوابة أهلية الفهرسة
الأكاديمية (§11 أدناه). الرقم التاريخي الأقدم (3,636 رابطًا، 1,038 منها صفحات
أكاديمية بمحتوى احتياطي مشترك) كان من تدقيق منفصل بتاريخ 2026-08-28 **قبل**
تفعيل البوابة — راجع §11 للتفاصيل والفارق. تدقيق حي جديد يتطلّب
`curl https://thecodefix.net/sitemap.xml` وقت الحاجة.

**المسارات:** HTML، CSS، JavaScript، TypeScript، React، Next.js، Node.js، Python،
Django، PHP، Laravel، Java، Kotlin، Swift، Flutter، C، C++، C#، Go، Rust، SQL،
MongoDB، Tailwind، Git، Docker، Linux، DSA، OOP، REST APIs، Networking،
Cybersecurity، + 20 مسارًا أُضيفت لاحقًا (AWS، Kubernetes، Terraform، AI/ML،
DevOps، Database Design، System Design، Microservices، Mobile، Dart، Ruby،
PowerShell، Redis، PostgreSQL، Compilers، Operating Systems، Software Testing،
Web Performance، API Security، Interview Prep) — القائمة الحيّة الكاملة دائمًا
في `src/content/tracks/`.

## 3) التقنيات (Tech Stack)

| الطبقة | التقنية |
|--------|---------|
| إطار العمل | Next.js 16 (App Router + Turbopack) + React 19 + TypeScript |
| التنسيق | Tailwind CSS v4 + @tailwindcss/typography |
| المحتوى | MDX عبر `next-mdx-remote/rsc` + gray-matter + rehype-highlight |
| المحرّر التفاعلي | Monaco Editor + Pyodide (بايثون WASM في Web Worker) |
| قاعدة البيانات | Neon Postgres + Drizzle ORM |
| المصادقة | Auth.js v5 (GitHub + Google OAuth) + Drizzle adapter، جلسات DB |
| المدفوعات | Stripe (مُجهّز — بانتظار مفاتيح الإنتاج) |
| التحليلات | Vercel Analytics + Speed Insights (بدون كوكيز) |
| الخطوط | Cairo (عربي) + JetBrains Mono (كود) |

## 4) بنية المشروع

```
src/
├── app/                    # الصفحات (App Router)
│   ├── learn/[tech]/[lesson]   # الدروس (SSG + OG images)
│   ├── quiz/[tech]             # الاختبارات
│   ├── certificate/[tech]      # الشهادات (طباعة + إصدار DB)
│   ├── verify                  # التحقّق من الشهادات علنًا
│   ├── playground              # المحرّر (JS / HTML / Python)
│   ├── roadmaps/[slug]         # خرائط الطريق
│   ├── blog/[slug]             # المدوّنة
│   ├── jobs/[slug]             # الوظائف (JobPosting schema)
│   ├── account                 # لوحة المتعلّم
│   ├── login                   # تسجيل دخول مخصّص
│   ├── admin/*                 # لوحة الإدارة (أقسام كثيرة — راجع §9)
│   └── api/                    # checkout, stripe/webhook, auth, cert-og
├── components/             # Playground, Header, Mdx, QuizRunner…
├── content/                # tracks/ blog/ quizzes/ jobs/ roadmaps/ (ملفات)
├── db/schema.ts            # 40 جدول Drizzle (راجع §10)
└── lib/                    # content, seo, rbac, flags, progress…
public/py-worker.js         # مشغّل بايثون المعزول (Web Worker)
scripts/                    # make-owner.mjs, notify-index.mjs
docs/                       # هذا التوثيق + SEO + التسويق
```

## 5) نظام المحتوى (مزدوج المصدر)

1. **ملفات MDX** (`src/content/tracks/<tech>/NN-slug.mdx`) — المصدر الأساسي؛
   frontmatter: title/description/order/keywords. تُبنى statically.
2. **CMS قاعدة بيانات** (جدولا `content_track` + `content_lesson`) — إنشاء لغات
   وصفحات جديدة من `/admin/content` **بدون نشر كود**؛ تظهر خلال ثوانٍ عبر
   revalidatePath + ISR. `content.ts` يدمج المصدرين (الملفات لها الأولوية).

**قواعد كتابة الدروس:** عناوين `##`، كود inline بين backticks، كتل مسوّرة
بلغتها، قسم "أخطاء شائعة"، تذييل `> 🎯 التالي:`، كلمات مفتاحية long-tail.
⚠️ لا تكتب `<T>` أو `<Tag>` خام خارج الكود — يكسر بناء MDX (لفّها بـ backticks).

## 6) المحرّر التفاعلي (Playground)

| الوضع | الآلية | الحماية |
|-------|--------|---------|
| **JavaScript** | iframe معزول (sandbox=allow-scripts) + postMessage | زر إيقاف يعيد إنشاء الـiframe؛ سقف إخراج 1000 سطر |
| **HTML/CSS** | معاينة حيّة (debounce 400ms) داخل مستند RTL | iframe معزول |
| **Python** | Pyodide داخل **Web Worker** (`public/py-worker.js`) | مهلة 25 ثانية (TLE) + terminate/restart، تعافٍ من انهيار الذاكرة، سقف إخراج 1000 سطر/500KB، فصل stdout/stderr، صندوق stdin لـ`input()`، تنظيف MEMFS بين التشغيلات، تنقية traceback بأرقام أسطر مطابقة للمحرّر، تحميل numpy/pandas تلقائيًا، تلميحات عربية للمكتبات غير المدعومة |

روابط مشاركة: `/playground?code=<base64>&mode=js|html|python`.
يُدمج في الدروس عبر `<Playground mode="python" initialCode={...} />`.

## 7) رحلة المتعلّم

**تقدّم** → localStorage (`tcf:progress`) + مزامنة DB للمسجّلين (`user_progress`)
→ **اختبار** (نجاح ≥ 60%) → **شهادة** تُصدر في DB برقم فريد → **تحقّق علني**
في `/verify?code=…` → لوحة `/account` (تقدّم، نتائج، شهادات، إشارات مرجعية،
أكمل من حيث توقفت).

## 8) المصادقة والصلاحيات (RBAC)

- **Auth.js v5**: GitHub + Google (يُفعَّلان بوجود env keys — `lib/flags.ts`).
- **أدوار (10)**: student / creator / support / writer / sales / operations /
  marketing / designer / admin / owner (نمت من 6 أدوار — `lib/rbac.ts`).
- **قدرات (11)** (`lib/rbac.ts`): admin:view، content:edit، users:manage،
  billing:manage، jobs:moderate، seo:manage، ops:manage، reports:submit،
  reports:review، creators:review، settings:manage.
- المالك الحالي: abusamrabaraa7@gmail.com (يُرقّى عبر `npm run make-owner`).
- ✅ Google OAuth في وضع **Production** منذ 2026-07-08 — الدخول مفتوح للجمهور بلا سقف.

## 9) لوحة الإدارة (`/admin` — أوسع بكثير من نسخة يوليو ذات 8 أقسام)

الرئيسية (إحصاءات + نشاط) · المحتوى (CMS كامل) · الاختبارات · خرائط الطريق ·
الوظائف · المستخدمون · أدوات SEO (متتبّع كلمات DB) · الفوترة (اشتراكات/شركات) ·
الإعدادات (أدوار + سجلّ تدقيق) · سجل التطوير `/admin/changelog` (بياناته في
`lib/changelog.ts`) · **تشخيص المحتوى** `/admin/diagnostics` · **المبدعون**
`/admin/creators` (+ صفحات تقديم/مراجعة) · **الجانب الأكاديمي**
`/admin/academic` (خطط الدراسة) · **العمليات** `/admin/operations` (قسم فرعي
جديد كامل: تعليمات المحتوى، المدرّسون `instructors`، تذاكر الدعم `tickets`،
والتواصل الخارجي `outreach`) · **Pipeline Discovery & Runner**
`/admin/pipeline/test` (تشغيل يدوي لخط أنابيب استخراج المناهج — Lane B
تملك التفاصيل التشغيلية بـ[`curriculum-pipeline-audit.md`](curriculum-pipeline-audit.md)).
راجع `ADMIN_SECTIONS` بـ`src/app/admin/page.tsx` و`Capability` بـ`src/lib/rbac.ts`
للقائمة الحيّة والمُصدَّقة.

## 10) قاعدة البيانات (40 جدولًا — كانت 14)

Auth: `user`, `account`, `session`, `verificationToken` ·
تعلّم: `user_progress`, `certificate`, `lesson_quiz_attempts`, `exam_attempts`,
`league_snapshots` ·
فوترة: `subscription`, `organization`, `organization_member` ·
CMS: `content_track`, `content_lesson` ·
تشغيل: `audit_log`, `seo_keyword`, `suggestion`, `notification`, `job_alerts` ·
مبدعون: `creator`, `post` ·
عمليات/دعم (جديد): `instructors`, `instructor_tracks`, `tickets`,
`ticket_reply`, `work_reports`, `outreach_contacts` ·
أكاديمي: `academic_study_plans` ·
خط أنابيب استخراج المناهج (جديد، 12 جدولًا — تفاصيل التشغيل والحوكمة في
[`curriculum-pipeline-audit.md`](curriculum-pipeline-audit.md) و
[`factual-data-governance.md`](factual-data-governance.md)):
`pipeline_university`, `pipeline_program`, `pipeline_source`,
`pipeline_document`, `pipeline_extraction_run`, `pipeline_extraction_evidence`,
`pipeline_curriculum_version`, `pipeline_course`, `pipeline_curriculum_course`,
`pipeline_course_prerequisite`, `pipeline_collection_job`,
`pipeline_review_queue`.

أوامر: `npm run db:generate | db:migrate | db:push | db:studio`.
⚠️ الـ migrations تستخدم `DATABASE_URL_UNPOOLED` (الـ pooled يفشل مع DDL).
⚠️ أعمدة id تُولَّد على مستوى التطبيق (`$defaultFn(randomUUID)`) — أي INSERT
يدوي بـ SQL خام يجب أن يمرّر id.

## 11) طبقة SEO

- **Metadata**: عناوين keyword-first للدروس ("<المسار> بالعربي: <الدرس>")،
  canonical ذاتي لكل صفحة، keywords per-page (`lib/seo.ts`)، OG/Twitter cards
  ديناميكية لكل درس ومقال.
- **JSON-LD**: Organization، WebSite+SearchAction، Course، LearningResource،
  BreadcrumbList، FAQPage، JobPosting، BlogPosting، ItemList.
- **Sitemap**: **2,641 رابطًا حيًّا بتاريخ 2026-09-05** (الأساس الحالي المعتمَد).
  **بوابة أهلية الفهرسة الأكاديمية (`isStudyPlanPublishable`،
  `src/lib/academic-indexability.ts`) منفَّذة ومُتحقَّق منها**: صفحة تخصّص
  أكاديمي (`/academic/<دولة>/<جامعة>/<تخصص>`) لا تدخل الـ sitemap إلا بخطة
  دراسة حقيقية منشورة فعلًا لتلك الجامعة تحديدًا — **رابط تخصّص أكاديمي واحد
  فقط حاليًا** (`academic-study-plans/jordan/hashemite-university/computer-science.json`،
  الملف الحقيقي الوحيد الموجود بالريبو بتاريخ 2026-09-05)، بدل الاعتماد على
  محتوى احتياطي مشترك. **سياق تاريخي (2026-08-28، قبل تفعيل البوابة):** تدقيق
  منفصل حينها رصد 3,636 رابطًا إجماليًّا و**1,038** صفحة تخصّص تعرض جميعها نفس
  المحتوى الاحتياطي (0 خطة دراسة حقيقية) — وُصِف بتقييم HIGH severity
  duplication/doorway risk. **هذا الرقم قديم ومُعالَج، لا حالة حالية.**
  التفاصيل التاريخية الكاملة (إن بقيت موجودة): `reports/seo-spam-audit-2026-08-28/`
  (مجلد scratch غير مُتتبَّع بـ git — لا يُعتمَد عليه كمرجع دائم).
- `/search` noindex.
- Search Console: موصول ومُتحقَّق سابقًا؛ **لا توجد بيانات GSC حيّة بهذا
  التدقيق** (نقرات/ظهور/فهرسة فعلية) — TBD، يحتاج تصدير من المالك. راجع
  `docs/seo-baseline-template.md` للتعبئة عند توفّر التصدير.
- الاستراتيجية الكاملة: [seo-strategy.md](seo-strategy.md) +
  [seo-keywords.md](seo-keywords.md) + [marketing_playbook.md](marketing_playbook.md).

## 12) الأمان

- OAuth فقط (لا كلمات مرور مخزّنة) · جلسات DB httpOnly.
- Stripe: تحقّق توقيع webhook قبل أي معالجة؛ checkout يتطلّب تسجيل دخول.
- أفعال الخادم تعيد التحقق من الصلاحية (`resolveAdmin` + `can`) داخل كل action.
- حارس path-traversal (`assertSafeSegment`) على كتابة ملفات الإدارة.
- JsonLd يفلتر `<` (منع كسر `</script>`) · صندوق الاقتراحات: honeypot + حدود.
- محتوى الأمن السيبراني **دفاعي فقط** (درس تاريخي سبّب علم Google — لا payloads حيّة).

## 13) متغيّرات البيئة

| المتغيّر | الوظيفة |
|----------|---------|
| `DATABASE_URL` / `_UNPOOLED` | Neon (يُضخّان من تكامل Vercel) |
| `AUTH_SECRET`, `AUTH_GITHUB_*`, `AUTH_GOOGLE_*` | تفعيل تسجيل الدخول |
| `STRIPE_SECRET_KEY`, `STRIPE_PRO_PRICE_ID`, `STRIPE_WEBHOOK_SECRET` | تفعيل الدفع (لم تُضبط للإنتاج بعد) |
| `NEXT_PUBLIC_SITE_URL` | الأصل القانوني (thecodefix.net) |
| `ADMIN_TOKEN` | بوابة الإدارة الاحتياطية قبل تفعيل Auth |
| `GOOGLE_INDEXING_KEY(_FILE)` | سكربت فهرسة الوظائف ([الدليل](search-indexing-api.md)) |

## 14) سير العمل اليومي

```bash
npm run dev        # تطوير محلي (منفذ 3000)
npm run build      # التحقق قبل أي دفع — يجب أن يبقى static
git push           # → نشر تلقائي على Vercel
npm run notify-index   # بعد إضافة/تعديل وظيفة
```

- الاعتماد على نجاح `next build` بدل اختبارات التشغيل المحلية (تفضيل المالك).
- OAuth الإنتاج له تطبيقات منفصلة (GitHub "The Code Fix Production" + Google).
- إجراءات النسخ والاستعادة موثقة في
  [`backup-restore-runbook.md`](backup-restore-runbook.md). يبقى تنفيذ restore
  drill معزول وتسجيل RPO/RTO الفعليين إجراءً تشغيليًا على المالك قبل اعتبار
  البند مكتملًا إنتاجيًا.

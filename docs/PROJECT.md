# 📘 The Code Fix — التوثيق الشامل للمشروع

> المرجع الكامل: ما هو المشروع، كيف يعمل، ممّ يتكوّن، وكيف تُدار كل أجزائه.
> آخر تحديث: **2026-07-03**. (الخطة المستقبلية في [ROADMAP.md](ROADMAP.md))

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

## 2) الأرقام الحالية (2026-07-03)

- **31 مسارًا** تعليميًّا كاملًا (A-Z) — **768 درسًا**
- **31 اختبارًا** (15 سؤالًا لكل مسار)
- **31 مقالة** مدوّنة (مقارنات، حلول أخطاء، مسار مهني)
- **9 خرائط طريق** مهنية غنيّة
- **941 صفحة** مبنيّة statically في كل build
- **14 جدول** قاعدة بيانات، 7 migrations

**المسارات:** HTML، CSS، JavaScript، TypeScript، React، Next.js، Node.js، Python،
Django، PHP، Laravel، Java، Kotlin، Swift، Flutter، C، C++، C#، Go، Rust، SQL،
MongoDB، Tailwind، Git، Docker، Linux، DSA، OOP، REST APIs، Networking،
Cybersecurity.

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
│   ├── admin/*                 # لوحة الإدارة (8 أقسام)
│   └── api/                    # checkout, stripe/webhook, auth, cert-og
├── components/             # Playground, Header, Mdx, QuizRunner…
├── content/                # tracks/ blog/ quizzes/ jobs/ roadmaps/ (ملفات)
├── db/schema.ts            # 14 جدول Drizzle
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
- **أدوار**: student / support / writer / sales / admin / owner.
- **قدرات** (`lib/rbac.ts`): content:edit، users:manage، billing:manage،
  jobs:moderate، seo:manage، settings:manage، admin:view.
- المالك الحالي: abusamrabaraa7@gmail.com (يُرقّى عبر `npm run make-owner`).
- ⚠️ Google OAuth ما زال في وضع **Testing** — يجب نشر شاشة الموافقة ليدخل العموم.

## 9) لوحة الإدارة (`/admin` — 8 أقسام)

الرئيسية (إحصاءات + نشاط) · المحتوى (CMS كامل) · الاختبارات والشهادات ·
الوظائف · المستخدمون · أدوات SEO (متتبّع كلمات DB) · الفوترة (اشتراكات/شركات) ·
الإعدادات (أدوار + سجلّ تدقيق). + سجل التطوير `/admin/changelog`
(بياناته في `lib/changelog.ts` — أضِف سطرًا عند كل عمل جديد).

## 10) قاعدة البيانات (14 جدولًا)

Auth: `user`, `account`, `session`, `verificationToken` ·
تعلّم: `user_progress`, `certificate` ·
فوترة: `subscription`, `organization`, `organization_member` ·
CMS: `content_track`, `content_lesson` ·
تشغيل: `audit_log`, `seo_keyword`, `suggestion`.

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
- **Sitemap**: ~880 رابطًا؛ `/search` noindex.
- Search Console: موصول ومُتحقَّق، sitemap مُرسَل. علم الأمان القديم **زال**.
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
- النسخ الاحتياطي حاليًا: Neon تلقائي + GitHub (لا خطة موثّقة بعد — انظر الخطة).

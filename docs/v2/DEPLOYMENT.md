# نشر V2

> V2 بمستودعها الخاص **`baraaabusamra/thecodefix.v2`** (فرع `main`، مع تاريخ V1 كامل).
> الموقع الحي thecodefix.net لسا بيشتغل من V1 (`baraaabusamra/thecodefix`) وما تأثّر بشي.
> هاي خطوات تحويل الإنتاج لما تقرر.

## اللي تغيّر بالنسبة لـ Vercel

| الإعداد | V1 | V2 |
|---|---|---|
| المستودع | `baraaabusamra/thecodefix` | **`baraaabusamra/thecodefix.v2`** |
| Root Directory | `.` (الجذر) | **`apps/web`** |
| Install Command | `npm install` | تلقائي (Vercel بيكتشف npm workspaces ويثبّت من الجذر) |
| Build Command | `next build` | تلقائي (`next build` داخل `apps/web`) — أو `npx turbo run build --filter=@tcf/web` |
| Include source files outside of the Root Directory | — | **لازم يكون مفعّل** — لأن `content/` و`packages/` و`modules/` خارج `apps/web` |
| Node.js | 24 (`.nvmrc`) | نفسه |
| متغيرات البيئة | — | نفسها بالضبط، ما في متغير جديد إجباري |

متغيرات اختيارية جديدة:

| المتغير | الاستخدام |
|---|---|
| `NEXT_PUBLIC_VIDEO_BLOB_BASE_URL` | رابط Vercel Blob للفيديو المستضاف ذاتيًا (ADR 0007) |
| `TCF_CONTENT_ROOT` | مسار مختلف لمجلد `content/` (للتجارب فقط) |

## الطريق المقترح: مشروع Vercel جديد، ثم نقل الدومين

المستودع الجديد بيخلّي التحويل آمن: مشروع V1 بيضل زي ما هو لحد آخر لحظة، والتراجع = إرجاع الدومين.

1. **مشروع جديد:** Vercel → Add New → Project → Import `baraaabusamra/thecodefix.v2` (اسم مثل `thecodefix-v2`). لو ما ظهر المستودع، أعطِ تطبيق Vercel على GitHub إذن الوصول إله.
2. **الإعدادات:** Root Directory = `apps/web`، و«Include source files outside of the Root Directory» مفعّل.
3. **متغيرات البيئة:** انسخها من مشروع V1، بس **لحد التحويل** خلّي `DATABASE_URL` يأشّر لفرع Neon للتجربة، **مش قاعدة الإنتاج** (عشان تسجيلات الدخول والتقدّم على رابط التجربة ما توصل للبيانات الحقيقية). بدون `AUTH_SECRET`/Stripe الموقع بيشتغل وهالميزات نايمة (الوضع الافتراضي).
4. **الفحص** على رابط `*.vercel.app` تبع المشروع الجديد — القائمة تحت.
5. **التحويل:**
   - بمشروع V2: `DATABASE_URL` (وباقي متغيرات الإنتاج) لقاعدة الإنتاج، ثم Redeploy. V2 ما بيغيّر schema ولا بيعمل أي ترحيل.
   - بمشروع V1: Settings → Domains → شيل `thecodefix.net` و`www.thecodefix.net`.
   - بمشروع V2: أضفهم. روابط OAuth (GitHub/Google) وwebhook تبع Stripe كلها على نفس الدومين، فما بتتغيّر.
6. **بعد التحويل:** Search Console — ما في ارتفاع بأخطاء 404. خلّي مشروع V1 كم أسبوع كخطة رجوع.

### بديل: نفس المستودع القديم

PR #130 بالمستودع القديم فيه نفس الكود. لو بدك تضل هناك: وقّف أي دمج على `main` ← غيّر Root Directory لمشروع V1 لـ `apps/web` ← Redeploy لمعاينة الفرع وافحصها ← ادمج. Root Directory إعداد للمشروع كله مش لكل فرع، فبين الخطوتين أي بناء جديد لـ `main` (V1) رح يفشل، بس النسخة الحية بتضل شغالة. (عشان هيك علامة «Vercel ✗» على PR #130 متوقعة.)

## قائمة الفحص قبل التحويل

- [ ] الـ CI أخضر على `thecodefix.v2` (البناء هناك بيجيب خطوط Google الحقيقية بـ Turbopack).
- [ ] على رابط المشروع الجديد: الرئيسية، درس، مقال، `/reference/...`، `/academic/...`، `/verify/...`، `/sitemap.xml`، `/robots.txt`، `/api/v1/tracks`.
- [ ] صور OG (`/learn/<track>/<lesson>/opengraph-image`) بتنعرض — بتقرأ الخطوط من `apps/web/assets/fonts`.
- [ ] تسجيل الدخول + صفحة الحساب + لوحة الإدارة مع قاعدة بيانات التجربة.
- [ ] مقارنة الـ sitemap بين الإنتاج والمشروع الجديد (نفس عدد الروابط).
- [ ] `lastModified` بالـ sitemap نفسه بين الاثنين (التواريخ جاية من تاريخ git، فما لازم المستودع الجديد ينضغط لـ commit واحد).

## التحقق اللي تم

- `npm run build:offline` (webpack + خطوط وهمية): نجح على Next.js 16.3.8.
- `next build` العادي (**Turbopack**، نفس اللي بيشغّله Vercel) مع استبدال مؤقت لخطوط Google (البيئة بلا إنترنت): نجح، وما انحفظ أي تعديل.
- الـ CI على GitHub (PR #130، خطوط حقيقية): كل الخطوات خضرا.
- قائمة الصفحات الثابتة المولّدة **مطابقة حرفيًا** لـ V1 بالبناءين: 3,967 رابط.
- المسارات: نفس الـ 96 + `/api/v1/tracks`، `/api/v1/tracks/[track]`، `/api/v1/tracks/[track]/lessons/[lesson]`.
- ملف التتبّع لصفحة الدرس فيه 1,498 ملف محتوى من `content/`، وصور OG فيها ملفات الخطوط.

## سير عمل «Deploy production» (`.github/workflows/deploy-production.yml`)

لو بتستخدمه: بالمستودع الجديد اعمل GitHub environment اسمها `production` فيها نفس الأسرار (`DATABASE_URL_UNPOOLED`، `VERCEL_TOKEN`، `VERCEL_ORG_ID`) مع `VERCEL_PROJECT_ID` **تبع المشروع الجديد**. الملف نفسه ما بيحتاج تعديل: `vercel pull` بيجيب إعداد Root Directory = `apps/web` فـ`vercel build` بيبني التطبيق الصحيح وهو بالجذر.

## الفروع القديمة (V1)

الـ 54 فرع غير المدموج موجودين بالمستودع القديم. لنقل واحد منهم:

```bash
git remote add v1 https://github.com/baraaabusamra/thecodefix   # مرة وحدة
git fetch v1
npm run port-branch -- content/css-refresh-2026-09-14   # بيقرأ من v1 تلقائيًا، وبيعمل v2/content/css-refresh-2026-09-14
```

## التراجع

قبل التحويل: ما في شي يرجع، الإنتاج على V1. بعد التحويل: رجّع الدومينين لمشروع V1 (دقائق). ما في أي ترحيل قاعدة بيانات بـ V2.

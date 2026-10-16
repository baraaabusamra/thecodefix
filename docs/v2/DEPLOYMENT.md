# نشر V2

> V2 لسا على فرع `thecodefix-v2`. الموقع الحي (`main`) ما تأثّر بشيء. هاي الخطوات لما تقرر الدمج.

## اللي تغيّر بالنسبة لـ Vercel

| الإعداد | V1 | V2 |
|---|---|---|
| Root Directory | `.` (الجذر) | **`apps/web`** |
| Install Command | `npm install` | تلقائي (Vercel بيكتشف npm workspaces ويثبّت من الجذر) |
| Build Command | `next build` | تلقائي (`next build` داخل `apps/web`) — أو `npx turbo run build --filter=@tcf/web` |
| Include source files outside of the Root Directory | — | **لازم يكون مفعّل** (تأكد بإعدادات المشروع) — لأن `content/` و`packages/` و`modules/` خارج `apps/web` |
| Node.js | 24 (`.nvmrc`) | نفسه |
| متغيرات البيئة | — | نفسها بالضبط، ما في متغير جديد إجباري |

متغيرات اختيارية جديدة:

| المتغير | الاستخدام |
|---|---|
| `NEXT_PUBLIC_VIDEO_BLOB_BASE_URL` | رابط Vercel Blob للفيديو المستضاف ذاتيًا (ADR 0007) |
| `TCF_CONTENT_ROOT` | مسار مختلف لمجلد `content/` (للتجارب فقط) |

## قائمة التحقق قبل تحويل الإنتاج

- [ ] PR #V2 مراجَع والـ CI أخضر على GitHub (البناء هناك بيجيب خطوط Google الحقيقية بـ Turbopack).
- [ ] **Preview deployment** للفرع بـ Root Directory = `apps/web` (من إعدادات المشروع → Git → Preview).
- [ ] على الـ Preview: الرئيسية، درس، مقال، `/reference/...`، `/academic/...`، `/verify/...`، `/sitemap.xml`، `/robots.txt`، `/api/v1/tracks`.
- [ ] صور OG (`/learn/<track>/<lesson>/opengraph-image`) بتنعرض — بتقرأ الخطوط من `apps/web/assets/fonts`.
- [ ] تسجيل الدخول + صفحة الحساب + لوحة الإدارة على الـ Preview مع قاعدة بيانات الـ preview.
- [ ] مقارنة الـ sitemap بين الإنتاج والـ Preview (نفس عدد الروابط).
- [ ] بعد الدمج: Search Console — ما في ارتفاع بأخطاء 404.

## التحقق اللي تم محليًا

- `npm run build:offline` (webpack + خطوط وهمية): نجح على Next.js 16.3.8.
- قائمة الصفحات الثابتة المولّدة **مطابقة حرفيًا** لـ V1: 3,967 رابط.
- المسارات: نفس الـ 96 + `/api/v1/tracks`، `/api/v1/tracks/[track]`، `/api/v1/tracks/[track]/lessons/[lesson]`.
- ملف التتبّع لصفحة الدرس فيه 1,498 ملف محتوى من `content/`، وصور OG فيها ملفات الخطوط.

## التراجع

الدمج = commit واحد على `main`. التراجع = `git revert` + إرجاع Root Directory لـ `.`. ما في أي ترحيل قاعدة بيانات بـ V2.

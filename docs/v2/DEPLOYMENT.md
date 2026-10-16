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

## المعاينة (Preview) قبل الدمج

**Root Directory إعداد للمشروع كله، مش لكل فرع.** عشان هيك معاينة فرع `thecodefix-v2` على مشروع Vercel الحالي (المبني من `.`) بتفشل، وهذا متوقع: علامة «Vercel ✗» على PR #130 سببها هذا، مش خطأ بالكود. طريقتين:

**أ) مشروع معاينة منفصل (الأسلم، صفر خطر على الإنتاج):**

1. Vercel → Add New → Project → نفس المستودع `baraaabusamra/thecodefix`، اسم مثل `thecodefix-v2`.
2. Root Directory = **`apps/web`**، والإطار Next.js (بيتعرّف تلقائيًا).
3. Settings → Git → Ignored Build Step، أمر مخصص: `[ "$VERCEL_GIT_COMMIT_REF" != "thecodefix-v2" ]` (بيبني فرع V2 بس).
4. متغيرات البيئة لبيئة Preview: نفس متغيرات المشروع الأصلي، بس `DATABASE_URL` لفرع Neon للمعاينة، **مش قاعدة الإنتاج**. بدون `AUTH_SECRET`/Stripe الموقع بيشتغل وهالميزات نايمة (الوضع الافتراضي).
5. بعد ما يتم الدمج والإنتاج يتحوّل، احذف هذا المشروع.

**ب) على نفس المشروع وقت الدمج:** وقّف أي دمج على `main` ← غيّر Root Directory لـ `apps/web` ← Redeploy لآخر معاينة من `thecodefix-v2` وافحصها ← ادمج. بين الخطوتين أي بناء جديد لـ `main` (V1) رح يفشل، بس النسخة الحية الحالية بتضل شغالة لأنه Vercel ما بينزّل نسخة شغالة بسبب بناء فاشل. إذا في مشكلة: رجّع Root Directory لـ `.`.

## قائمة التحقق قبل تحويل الإنتاج

- [ ] PR #130 مراجَع والـ CI أخضر على GitHub (البناء هناك بيجيب خطوط Google الحقيقية بـ Turbopack).
- [ ] معاينة شغّالة لفرع V2 بإحدى الطريقتين فوق.
- [ ] على الـ Preview: الرئيسية، درس، مقال، `/reference/...`، `/academic/...`، `/verify/...`، `/sitemap.xml`، `/robots.txt`، `/api/v1/tracks`.
- [ ] صور OG (`/learn/<track>/<lesson>/opengraph-image`) بتنعرض — بتقرأ الخطوط من `apps/web/assets/fonts`.
- [ ] تسجيل الدخول + صفحة الحساب + لوحة الإدارة على الـ Preview مع قاعدة بيانات الـ preview.
- [ ] مقارنة الـ sitemap بين الإنتاج والـ Preview (نفس عدد الروابط).
- [ ] بعد الدمج: Search Console — ما في ارتفاع بأخطاء 404.

## التحقق اللي تم محليًا

- `npm run build:offline` (webpack + خطوط وهمية): نجح على Next.js 16.3.8.
- `next build` العادي (**Turbopack**، نفس اللي بيشغّله Vercel) مع استبدال مؤقت لخطوط Google (البيئة بلا إنترنت): نجح، وما انحفظ أي تعديل.
- قائمة الصفحات الثابتة المولّدة **مطابقة حرفيًا** لـ V1 بالبناءين: 3,967 رابط.
- المسارات: نفس الـ 96 + `/api/v1/tracks`، `/api/v1/tracks/[track]`، `/api/v1/tracks/[track]/lessons/[lesson]`.
- ملف التتبّع لصفحة الدرس فيه 1,498 ملف محتوى من `content/`، وصور OG فيها ملفات الخطوط.

## سير عمل «Deploy production» (`.github/workflows/deploy-production.yml`)

ما بيحتاج تعديل: بيشغّل `npm run ci` من الجذر، والترحيل من `packages/db` عبر سكربتات الجذر نفسها، و`vercel pull` بيجيب إعداد Root Directory = `apps/web` من المشروع فـ`vercel build` بيبني التطبيق الصحيح وهو بالجذر. المهم إنه الإعداد يتغيّر بـ Vercel **قبل** أول تشغيل بعد الدمج.

## التراجع

الدمج = commit واحد على `main`. التراجع = `git revert` + إرجاع Root Directory لـ `.`. ما في أي ترحيل قاعدة بيانات بـ V2.

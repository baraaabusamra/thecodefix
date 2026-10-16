# ADR 0003 — شجرة محتوى مستقلة لكل لغة

- **الحالة:** مقترح
- **التاريخ:** 2026-10-16

## السياق

V1 قرأ كل المحتوى من `path.join(process.cwd(), "src", "content", …)` — مربوط بمجلد تطبيق واحد وبلغة واحدة. V2 بدها لغات، وAPI للموبايل، وربما تطبيقات ثانية تقرأ نفس المحتوى.

## القرار

```
content/
  ar/                    المحتوى التحريري العربي
    tracks/<track>/*.mdx   (51 مسار، 1,233 درس)
    blog/*.mdx             (103 مقال)
    reference/*.json  quizzes/  quiz-bank/  roadmaps/  jobs/
  en/                    (لاحقًا — نفس البنية)
  data/                  بيانات حقيقية محايدة لغويًا
    academic/  academic-universities/  academic-study-plans/  lesson-dates.json
    content-backlog.json
  _drafts/wave-1/        مسودات غير منشورة
```

- القراءة دايمًا عبر `@tcf/content/paths`: `contentDir("tracks", locale)` و`dataDir("academic")`. الجذر بيتحدد مرة: `TCF_CONTENT_ROOT` إذا موجود، وإلا أقرب `content/` فيه `ar/` صعودًا من مجلد العمل. بيشتغل من الجذر (اختبارات وسكربتات)، ومن `apps/web` (next dev/build)، وعلى Vercel.
- `apps/web/next.config.ts`: `outputFileTracingRoot` = جذر المستودع، و`outputFileTracingIncludes` بيضمّن `content/ar` و`content/data` (القراءة ديناميكية والتحليل الثابت ما بيلحقها). **تم التحقق:** ملف التتبّع لصفحة الدرس فيه 1,498 ملف محتوى.
- روابط الموقع ما تغيّرت — الرابط مبني من الـ slug، مش من مسار الملف.
- `lesson-dates.json` صار يتصدّر من `@tcf/content/lesson-dates`، والمولّد (`npm run dates:generate`) بيتجاهل النقل الصافي (rename 100%) حتى ما يدّعي كل درس إنه «اتحدّث اليوم» (seo-technical-policy §13).

## العواقب

- الفروع القديمة اللي بتعدّل `src/content/…` بتنتقل بـ `npm run port-branch` (بيعيد كتابة المسارات تلقائيًا).
- سكربتات الفحص (`check:*`) صارت تقرأ `content/ar` و`content/data`.

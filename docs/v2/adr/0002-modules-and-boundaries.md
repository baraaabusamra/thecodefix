# ADR 0002 — وحدات ميزات بحدود مفروضة باختبارات

- **الحالة:** مقترح
- **التاريخ:** 2026-10-16

## السياق

بـ V1، الميزة الواحدة (مثلًا منشئو المحتوى) كانت موزّعة على `src/app` و`src/components` و`src/lib` و`src/db/schema.ts`. `src/lib` كان ~70 ملف مسطّح. فرع `refactor/phase-2-architecture` أضاف اختبارات حدود بين **الطبقات**، بس V2 بحاجة لحدود بين **الميزات**.

## القرار

- **11 وحدة ميزة** (`modules/*`): learning، progress، assessment، certificates، billing، creators، academic، jobs، feedback، media، admin. كل وحدة فيها: منطق (`src/*.ts`)، Server Actions (`src/actions/`)، واجهة (`src/ui/`)، واستعلامات إدارة (`src/admin/`).
- **7 حزم أساس** (`packages/*`): core، db، observability، identity، content، ui، contracts.
- **الاتجاه:** `apps → modules → packages`. الحدود مفروضة بـ `tests/architecture-boundaries.test.mjs` (اتجاه، قائمة مسموحة بين الوحدات، بلا دورات بين الحزم والملفات، اعتماديات معلنة، ملفات السيرفر ما بتوصل للمتصفح، README + MAP.svg لكل حزمة).
- **الاستثناءات المسموحة بين الوحدات** (كلها باتجاه واحد):

  | من | إلى | ليش |
  |---|---|---|
  | learning | progress | مكونات الدرس بتعرض حالة الإكمال والمفضلة |
  | assessment | progress | نتيجة اختبار التدريب بتنحفظ بمخزن التقدّم |
  | certificates | assessment، progress | الشهادة بتعتمد على الامتحان المصحّح والتقدّم |
  | academic | jobs | صفحات التخصصات بتربط بالوظائف حسب الدولة |
  | admin | assessment، progress | لوحة الإدارة بتجمّع الوحدات |

- **فصل لوحة الإدارة منطقيًا (مش فعليًا):** `@tcf/admin` وحدة عادية، ما في وحدة بتستورده، وصفحات الإدارة بـ `apps/web/src/app/admin`. لما نحتاج تطبيق إدارة منفصل، بننشئ `apps/admin` وبيستورد نفس الوحدات بدون أي نقل.

## الدورات اللي انكسرت وقت النقل

النقل كشف 3 دورات كانت مخفية بـ `src/lib`:
1. learning ↔ progress: `bookmarks` و`recent` انتقلوا لـ progress (هم حالة متعلّم زي التقدّم).
2. assessment ↔ progress: قارئ اختبارات التدريب (`quiz.ts`) صار `@tcf/content/quizzes` — هو قراءة محتوى أصلًا.
3. ui → jobs: `CountryFlag` صار بياخذ prop بنيوي بدل ما يستورد نوع من jobs.

## العواقب

- إضافة ميزة = `npm run new-module` (بيسجّلها بالخريطة والاختبارات).
- إضافة سهم بين وحدتين بتحتاج تعديل `MODULE_DEPS` + ADR — قرار واعي، مش انزلاق.

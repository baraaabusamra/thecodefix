# ADR 0006 — API للموبايل: `/api/v1` + عقود مشتركة

- **الحالة:** مقترح — النسخة الأولى منفّذة ومختبرة
- **التاريخ:** 2026-10-16

## السياق

تطبيق الموبايل ما بيقدر يستدعي Server Actions ولا يقرأ ملفات MDX. بده HTTP API ثابت.

## القرار

- **`@tcf/contracts`**: مخطط zod لكل استجابة (`TracksResponseSchema`، `TrackResponseSchema`، `LessonResponseSchema`، `ApiErrorSchema`). السيرفر والموبايل بيتحققوا بنفس المخطط.
- **`/api/v1`** (Route Handlers رفيعة بـ `apps/web/src/app/api/v1`، منطقها بـ `apps/web/src/server/api-v1.ts`):

  | الطريقة | الرابط | الاستجابة |
  |---|---|---|
  | GET | `/api/v1/tracks` | كل المسارات مع عدد الدروس |
  | GET | `/api/v1/tracks/:track` | المسار ودروسه بالترتيب |
  | GET | `/api/v1/tracks/:track/lessons/:lesson` | الدرس: نص MDX، الدرس السابق والتالي، آخر تحديث |

- بتقرأ من **نفس** قارئات `@tcf/content` اللي بيعرض منها الموقع — مستحيل الموقع والموبايل يختلفوا.
- كاش CDN (`s-maxage=3600, stale-while-revalidate=86400`)، تحقق من الـ slug قبل لمس القرص، rate limit لكل IP، وأخطاء بشكل موحّد `{ error: { code, message } }`.
- **الإصدارات:** أي تغيير بيكسر العقد = `/api/v2`. `v1` بيضل شغال.
- `robots.ts` أصلًا بيمنع `/api/` من الزحف.

## الخطوات الجاية

1. هوية الموبايل: توكنات قصيرة العمر (Auth.js أو JWT موقّع) لـ endpoints التقدّم والشهادات.
2. `POST /api/v1/progress` (نفس منطق `@tcf/progress/actions/progress` بس عبر HTTP).
3. `apps/mobile` (Expo) — الـ skill `vercel-react-native-skills` موجود بالمستودع.

## التحقق

`tests/api-v1.test.mjs`: 6 اختبارات بتستدعي الـ handlers الحقيقية على المحتوى الحقيقي وبتتحقق من كل استجابة بالعقود (قائمة، تفاصيل، درس، 404، slug خبيث، rate limit).

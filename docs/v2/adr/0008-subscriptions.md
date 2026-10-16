# ADR 0008 — الاشتراكات الشهرية والاستحقاقات

- **الحالة:** مقترح — تصميم؛ الأساس موجود
- **التاريخ:** 2026-10-16

## السياق

V1 فيه `@tcf/billing` (Stripe Checkout + webhook مع idempotency + جدول اشتراكات) لخطة Pro واحدة، والدفع مقفل بانتظار ميزات مدفوعة حقيقية (`ENFORCED_PRO_FEATURES` + `tests/pro-checkout-gate.test.mjs`). V2 بده اشتراكات شهرية وفيديو مدفوع وحسابات جامعات.

## القرار

- **الاستحقاق (entitlement) هو مصدر الحقيقة، مش الاشتراك.** أي ميزة بتسأل: `hasEntitlement(userId, "video:premium")` — مش «هل عنده Pro؟». هيك خطة جديدة أو جامعة بتعطي استحقاقات بدون تعديل الميزات.
- `@tcf/billing` بيضيف (المرحلة 2):
  - `plans` (شهري/سنوي، السعر، الاستحقاقات)، `entitlements` (المستخدم أو المؤسسة، المصدر: اشتراك/جامعة/منحة، تاريخ الانتهاء).
  - كل كتابة من الـ webhook (`checkout.session.completed`، `customer.subscription.updated/deleted`، `invoice.payment_failed`) داخل **`withTransaction`** (ADR 0004): تحديث الاشتراك + الاستحقاقات + سجل التدقيق كلها أو لا شيء.
- **فحص الاستحقاق على السيرفر فقط** (نفس مبدأ حدّ الثقة بالتقييمات بـ V1)؛ الواجهة بتعرض فقط.
- **الترحيلات:** جداول جديدة بترحيل جديد بعد مراجعة `schema-design` (الأمر الموجود بـ `.claude/commands`). V2 ما أضاف أي جدول.

## خطوات التنفيذ

1. ترحيل `plans` + `entitlements` + اختبارات PGlite.
2. `hasEntitlement()` + اختبار بيمنع أي ميزة مدفوعة بدون فحصه (على نمط `pro-checkout-gate`).
3. webhook داخل معاملات.
4. ربط `@tcf/media` (الفيديو المدفوع) و`@tcf/academic` (مقاعد الجامعات).

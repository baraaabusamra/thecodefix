# ADR 0010 — Server Actions بتعيش جوّا الوحدات

- **الحالة:** مقترح — منفّذ
- **التاريخ:** 2026-10-16

## السياق

بـ V1، كل Server Action كانت بملف `actions.ts` جنب الصفحة بـ `src/app`، و13 مكون + `src/lib/progress.ts` كانوا بيستوردوها من هناك («Server Action seam» — استثناء موثّق باختبار الحدود). بـ V2 هاد يعني إنه الوحدات بتعتمد على كود المسارات — عكس الاتجاه.

## القرار

- كل ملف `"use server"` انتقل لوحدته: `modules/<m>/src/actions/<name>.ts` (27 ملف). مثال: `src/app/quiz/[tech]/exam-actions.ts` ← `modules/assessment/src/actions/exam.ts`.
- الصفحات والمكونات بتستوردها من الوحدة: `@tcf/assessment/actions/exam`.
- إجراءات جلسة الإدارة (`submitAdminKey`, `adminSignOut`) ← `@tcf/identity/actions/admin-session`.

## الدليل

- **تجربة معزولة** قبل النقل: Next.js 16 بنى Server Action داخل workspace package بنجاح وسجّلها بـ `server-reference-manifest.json`.
- بعد النقل: البناء الإنتاجي نجح، و`tests/rbac-matrix.test.mjs` (كل Server Action × 10 أدوار) نجح على المسارات الجديدة.

## العواقب

- قاعدة «كل Server Action تفحص الصلاحية بنفسها» ما تغيّرت — الملف انتقل، الحارس معه.
- لوحة إدارة منفصلة مستقبلًا ممكن تستورد نفس الـ actions بدون نسخ.

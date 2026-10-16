#!/usr/bin/env node
// scripts/v2/migration-doc.mjs
// 📍 خريطة: منطقة "مختبر الجودة" ← يولّد docs/v2/MIGRATION.md من خريطة الانتقال
// One table for "where did this V1 file go?", generated from scripts/v2/layout.mjs
// so it can never disagree with the tools that did the move.

import fs from "node:fs";
import { RULES, PACKAGES, packageOf } from "./layout.mjs";

const rows = RULES.map(([from, to]) => {
  const pkg = packageOf(to);
  return `| \`${from}\` | \`${to}\` | ${pkg ? `\`${pkg}\`` : to.startsWith("content/") ? "المحتوى" : to.startsWith("archive/") ? "أرشيف" : "—"} |`;
});
const md = `# دليل الانتقال من V1 إلى V2

> مولَّد من \`scripts/v2/layout.mjs\` بـ \`node scripts/v2/migration-doc.mjs\` — لا تعدّله يدويًا.
> القاعدة الأولى المطابقة هي اللي بتنطبق؛ القاعدة اللي بتنتهي بـ \`/\` بتنقل مجلد كامل بنفس بنيته.

## سؤال سريع: وين صار ملفي؟

\`\`\`bash
node scripts/audit/where.mjs content.ts          # الاسم أو جزء منه — بيعطيك المكان الجديد ومين بيستخدمه
grep -n '"src/lib/content.ts"' scripts/v2/layout.mjs
\`\`\`

## كيف أنقل فرع قديم؟

\`\`\`bash
npm run port-branch -- content/css-refresh-2026-09-14      # بيعمل فرع v2/content/css-refresh-2026-09-14
npm run typecheck && npm test && npm run check:all
git push -u origin v2/content/css-refresh-2026-09-14
\`\`\`

الأداة بتعيد كتابة كل المسارات، بتطبّق التغييرات بطريقة 3-way، بتعيد توليد \`lesson-dates.json\` بدل دمجه، وبتحوّل استيرادات \`@/lib/…\` القديمة لأسماء V2. تمت تجربتها على \`content/css-refresh-2026-09-14\`: 4 ملفات وصلت لأماكنها الجديدة وكل الفحوصات نجحت.

## الاستيراد: قبل وبعد

| V1 | V2 |
|---|---|
| \`import { getTracks } from "@/lib/content"\` | \`import { getTracks } from "@tcf/content/tracks"\` |
| \`import { db } from "@/db"\` | \`import { db } from "@tcf/db"\` |
| \`import { requireCapability } from "@/lib/authorization"\` | \`import { requireCapability } from "@tcf/identity/authorization"\` |
| \`import ExamRunner from "@/components/ExamRunner"\` | \`import ExamRunner from "@tcf/assessment/ui/ExamRunner"\` |
| \`import { startOrResumeExam } from "@/app/quiz/[tech]/exam-actions"\` | \`import { startOrResumeExam } from "@tcf/assessment/actions/exam"\` |
| \`path.join(process.cwd(), "src", "content", "blog")\` | \`contentDir("blog")\` من \`@tcf/content/paths\` |

## كل القواعد (${RULES.length})

| V1 | V2 | الحزمة |
|---|---|---|
${rows.join("\n")}

## الحزم (${Object.keys(PACKAGES).length})

| الحزمة | المكان | النوع | الوصف |
|---|---|---|---|
${Object.entries(PACKAGES).map(([n, p]) => `| \`${n}\` | \`${p.dir}\` | ${p.role} | ${p.desc} |`).join("\n")}
`;
fs.writeFileSync("docs/v2/MIGRATION.md", md);
console.log(`docs/v2/MIGRATION.md: ${RULES.length} rules, ${Object.keys(PACKAGES).length} packages`);

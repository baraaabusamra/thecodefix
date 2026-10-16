# The Code Fix V2 — دليل القراءة

| ابدأ هون | ليش |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | الصورة الكاملة: الخريطة، الطبقات، القواعد السبع، وين أحط الكود |
| [../project-map/MAP.md](../project-map/MAP.md) | خريطة المول الكاملة (مولّدة) |
| [MIGRATION.md](MIGRATION.md) | كل ملف من V1 ووين صار، وكيف تنقل فرع قديم |
| [adr/](adr/) | عشرة قرارات معمارية بأسبابها وبدائلها |
| [SECURITY.md](SECURITY.md) | الثغرات اللي اتصلّحت والمتبقي |
| [DEPLOYMENT.md](DEPLOYMENT.md) | التغيير الوحيد المطلوب بـ Vercel وقائمة التحقق |
| [ROADMAP.md](ROADMAP.md) | الخطوات الجاية بالترتيب |

## أوامر بتحتاجها كل يوم

```bash
npm install                 # مرة وحدة: بيربط كل الحزم
npm run dev                 # الموقع على localhost:3000
npm run typecheck && npm run lint && npm test && npm run check:all
npm run map                 # فحص + خريطة + «أنت هنا»
node scripts/audit/where.mjs <ملف>
npm run new-module <name> "<وصف>"
```

## Skills للوكلاء (Claude)

| Skill | متى |
|---|---|
| `v2-architecture` | قبل إضافة أو نقل أي كود بـ V2 |
| `project-map` | «وين الملف الفلاني؟ مين بيستخدمه؟» |
| `audit-security` / `audit-code` / `audit-content` / `audit-branches` | الفحص قبل أي PR |
| `turborepo`، `vercel-react-best-practices`، `vercel-composition-patterns`، `vercel-react-native-skills`، `next-dev-loop` | skills رسمية من Vercel (انظر `.claude/skills/THIRD_PARTY.md`) |

// Development log data for the admin "سجل التطوير" page.
// Each entry records WHAT was (or will be) added, WHEN, its SIZE, and the
// concrete functions / components / features it includes. Newest first.

export type ChangeCategory = "ميزة" | "محتوى" | "بنية" | "تحسين";
export type ChangeStatus = "done" | "planned";

export type ChangeEntry = {
  date: string; // "YYYY-MM-DD" for done; "—" or quarter for planned
  title: string;
  category: ChangeCategory;
  status: ChangeStatus;
  size: string; // human-readable size of the change
  items: string[]; // the functions / components / features included
};

export const CHANGELOG: ChangeEntry[] = [
  // ───────────────────────── DONE ─────────────────────────
  {
    date: "2026-06-28",
    title: "جميع المسارات الـ31 أصبحت دورات كاملة A-Z",
    category: "محتوى",
    status: "done",
    size: "~400 درس جديد + اختبارات 15 سؤالًا",
    items: [
      "إكمال: C، Git، Docker، DSA، Next.js، Linux، Rust، Kotlin، Swift",
      "إكمال: MongoDB، Tailwind، REST APIs، OOP، الشبكات، Django، Flutter",
      "إكمال: الأمن السيبراني (محتوى دفاعي فقط)",
      "كل مسار: 20–26 درسًا + اختبار 15 سؤالًا، كلها منشورة",
    ],
  },
  {
    date: "2026-06-28",
    title: "تحسينات تجربة الموقع والتصميم",
    category: "تحسين",
    status: "done",
    size: "نظام إنجازات + تقدّم المسار + حركات",
    items: [
      "نظام الإنجازات (شارات) مبني على تقدّم المتعلّم — يظهر في الحساب",
      "بطاقة تقدّم المسار في صفحة كل مسار + زرّ «تابع» لأوّل درس غير مكتمل",
      "حركات ظهور سلسة للأقسام عند التمرير (تحترم تقليل الحركة)",
    ],
  },
  {
    date: "2026-06-28",
    title: "اكتمال ميزات قوّة لوحة الإدارة",
    category: "ميزة",
    status: "done",
    size: "تصدير شامل + تصفية حيّة",
    items: [
      "تصدير المستخدمين CSV (مع التقدّم) في قسم المستخدمين",
      "تصدير بنك الأسئلة CSV في قسم الاختبارات",
      "تصفية حيّة لجدول المسارات في الرئيسية (TableFilter)",
      "بهذا تكتمل حزمة قوّة اللوحة: ⌘K + تحليلات + نشاط + تشخيص + تصدير",
    ],
  },
  {
    date: "2026-06-28",
    title: "تشخيص المحتوى والتصدير (لوحة الإدارة)",
    category: "ميزة",
    status: "done",
    size: "صفحة تشخيص + تصدير CSV",
    items: [
      "صفحة /admin/diagnostics: فحص جودة كل مسار (اكتمال الدروس والاختبار)",
      "كشف الدروس بلا وصف أو كلمات مفتاحية وأرقام الترتيب المكرّرة",
      "ملخّص صحّة المحتوى + تصدير الجرد الكامل كـ CSV (يدعم العربية)",
      "مكوّن ExportButton عامّ + إضافة القسم للشريط الجانبي ولوحة الأوامر",
    ],
  },
  {
    date: "2026-06-28",
    title: "ميزات قوّة لوحة الإدارة",
    category: "ميزة",
    status: "done",
    size: "بحث + تحليلات + سجلّ نشاط",
    items: [
      "لوحة أوامر إدارية (⌘K) للانتقال السريع بين الأقسام والمحرّرات",
      "تحليلات بصرية في الرئيسية: مخطّط الدروس لكل مسار + نسبة اكتمال المحتوى",
      "سجلّ آخر النشاط الإداري (من audit_log) مع حالة فارغة لطيفة",
      "بطاقات إحصائية محدّثة (أسئلة الاختبار، المسارات المكتملة)",
    ],
  },
  {
    date: "2026-06-27",
    title: "راحة القراءة والتصميم المتجاوب لكل الشاشات",
    category: "تحسين",
    status: "done",
    size: "3 مكوّنات + أنماط متجاوبة",
    items: [
      "التحكّم بحجم الخط (ص/ع/ك/كك) مع حفظ التفضيل — TextSizeControl",
      "زرّ طباعة الدرس بتنسيق نظيف — PrintButton",
      "تقييم «هل كان الدرس مفيدًا؟» — LessonFeedback",
      "عرض الدروس بعرض قراءة مريح (75ch) على الشاشات الكبيرة/التلفاز",
      "تخطيطات أوسع وأعمدة أكثر على الشاشات الضخمة (2xl)",
    ],
  },
  {
    date: "2026-06-27",
    title: "صفحة سجل التطوير في لوحة الإدارة",
    category: "ميزة",
    status: "done",
    size: "صفحة + وحدة بيانات",
    items: [
      "صفحة /admin/changelog محميّة بصلاحية content:edit",
      "وحدة src/lib/changelog.ts (بيانات السجل المصنّفة)",
      "بطاقات إحصائية حيّة: المسارات، الدروس، الاختبارات، حجم المحتوى",
      "خطّ زمني لِما أُنجز + قائمة لِما سيُضاف",
    ],
  },
  {
    date: "2026-06-27",
    title: "تطوير تجربة المتعلّم (دفعة ميزات)",
    category: "ميزة",
    status: "done",
    size: "12 مكوّنًا جديدًا",
    items: [
      "لوحة أوامر بحث فوري (⌘K / Ctrl+K) — CommandPalette",
      "زرّ نسخ الكود على كل مقطع برمجي — CodeBlock",
      "شريط تقدّم القراءة — ReadingProgress",
      "فهرس «في هذه الصفحة» — OnThisPage",
      "زمن القراءة المقدّر ورقم الدرس",
      "حفظ الدروس (Bookmarks) + عرضها في الحساب",
      "«تابع من حيث توقّفت» في الرئيسية — ContinueLearning",
      "التنقّل بين الدروس بالأسهم — LessonKeyNav",
      "زرّ المشاركة — ShareButton",
      "زرّ العودة للأعلى — ScrollToTop",
      "صفحة 404 مخصّصة + تمرير سلس",
      "PWA manifest (قابل للتثبيت) + theme-color + رابط تخطّي للمحتوى",
    ],
  },
  {
    date: "2026-06-27",
    title: "إكمال مسارات C و Git و Docker و DSA + اختبار C++",
    category: "محتوى",
    status: "done",
    size: "+88 درسًا، 4 اختبارات (15 سؤالًا)",
    items: [
      "C: دورة كاملة 25 درسًا + اختبار 15 سؤالًا",
      "Git: دورة كاملة 25 درسًا + اختبار 15 سؤالًا",
      "Docker: دورة كاملة 25 درسًا + اختبار 15 سؤالًا",
      "هياكل البيانات (DSA): دورة كاملة 25 درسًا + اختبار 15 سؤالًا",
      "C++: توسيع الاختبار إلى 15 سؤالًا",
    ],
  },
  {
    date: "2026-06-26",
    title: "إكمال مسار C# (A-Z)",
    category: "محتوى",
    status: "done",
    size: "25 درسًا + اختبار 15 سؤالًا",
    items: ["دروس 04–24", "توسيع اختبار C# إلى 15 سؤالًا"],
  },
  {
    date: "2026-06-25",
    title: "إكمال مسارات SQL و Java و Go و C++",
    category: "محتوى",
    status: "done",
    size: "~80 درسًا",
    items: ["دورات A-Z كاملة لكل مسار", "اختبارات موسّعة 15 سؤالًا"],
  },
  {
    date: "2026-06-24",
    title: "إكمال مسارات Python و TypeScript و Node.js و PHP و Laravel",
    category: "محتوى",
    status: "done",
    size: "~120 درسًا",
    items: ["دورات A-Z كاملة", "تضمين محرّر بايثون في الدروس", "اختبارات 15 سؤالًا"],
  },
  {
    date: "2026-06-21",
    title: "لوحة إدارة متكاملة (8 أقسام) + المصادقة وقاعدة البيانات",
    category: "بنية",
    status: "done",
    size: "8 أقسام + 12 جدولًا",
    items: [
      "الأقسام: الرئيسية، المحتوى، الاختبارات، المستخدمون، الاشتراكات، الوظائف، SEO، الإعدادات",
      "مصادقة Auth.js (GitHub + Google) + جلسات قاعدة بيانات",
      "صلاحيات RBAC قائمة على القدرات (rbac.ts)",
      "نظام إدارة محتوى (CMS) لإنشاء مسارات ودروس من اللوحة",
      "Neon Postgres + Drizzle ORM",
    ],
  },
  {
    date: "2026-06-21",
    title: "خرائط الطريق + محرّر تفاعلي (JS / HTML / Python)",
    category: "ميزة",
    status: "done",
    size: "9 خرائط + محرّر 3 لغات",
    items: [
      "/roadmaps مع 9 مسارات مهنية مترابطة",
      "محرّر Monaco يشغّل JS و HTML/CSS و Python (Pyodide)",
      "روابط مشاركة + تضمين المحرّر داخل الدروس",
    ],
  },
  {
    date: "2026-06-20",
    title: "الاختبارات والشهادات + تتبّع التقدّم + المدوّنة ولوحة الوظائف",
    category: "ميزة",
    status: "done",
    size: "أنظمة متعدّدة",
    items: [
      "محرّك اختبارات + شهادات قابلة للطباعة + تحقّق /verify",
      "تتبّع التقدّم (localStorage + مزامنة قاعدة بيانات للمسجّلين)",
      "مدوّنة MDX + لوحة وظائف ببيانات JSON و JobPosting JSON-LD",
    ],
  },

  // ──────────────────────── PLANNED ───────────────────────
  {
    date: "قريبًا",
    title: "إكمال المسارات الـ13 المتبقّية (A-Z)",
    category: "محتوى",
    status: "planned",
    size: "~270 درسًا متوقّعًا",
    items: [
      "Next.js، الشبكات، Django، Flutter (5 دروس حاليًا)",
      "Linux، MongoDB، Tailwind، الأمن السيبراني، REST APIs، Rust، Kotlin، Swift (3 دروس)",
      "البرمجة كائنية التوجّه OOP (درسان)",
      "توسيع كل اختبار إلى 15 سؤالًا",
    ],
  },
  {
    date: "قريبًا",
    title: "ربط Stripe بجداول الاشتراكات",
    category: "بنية",
    status: "planned",
    size: "تكامل دفع",
    items: [
      "ربط webhook الدفع بجداول subscription / organization",
      "تفعيل اشتراكات Pro والباقات للشركات",
      "بوابات دفع محلّية (Moyasar / Paymob) لاحقًا",
    ],
  },
  {
    date: "قريبًا",
    title: "بحث متقدّم + تحسينات SEO",
    category: "تحسين",
    status: "planned",
    size: "تحسينات",
    items: [
      "بحث Algolia / Meilisearch",
      "جلب ترتيب الكلمات من Search Console API",
      "معالجة ازدواج درس C# 03-oop (إعادة صياغة آمنة للروابط)",
    ],
  },
];

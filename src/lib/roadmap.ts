// Strategic 1-year roadmap shown on the internal /admin/roadmap page.
// Q3 2026 → Q2 2027, across three streams. Edit here to update the vision.

export type RoadmapStream = "هندسة ومنتج" | "محتوى و SEO" | "تسويق ونموّ";

export type RoadmapItem = {
  stream: RoadmapStream;
  title: string;
  detail: string;
};

export type RoadmapQuarter = {
  id: string; // "Q3 2026"
  label: string; // Arabic quarter label
  window: string; // month range
  theme: string; // quarter headline
  items: RoadmapItem[];
};

export const ROADMAP: RoadmapQuarter[] = [
  {
    id: "Q3 2026",
    label: "الربع الثالث 2026",
    window: "يوليو – سبتمبر",
    theme: "التحقّق وتفعيل الدخل",
    items: [
      {
        stream: "هندسة ومنتج",
        title: "ربط Stripe بجداول الاشتراكات وتفعيل باقة Pro",
        detail:
          "ربط webhook الدفع بجداول subscription / organization، وتمهيد لبوابات دفع محلّية (Moyasar / Paymob).",
      },
      {
        stream: "محتوى و SEO",
        title: "التحرّك على بيانات Search Console الأولى",
        detail:
          "توسيع المقالات الرابحة، سدّ فجوات الكلمات المفتاحية، وإثراء الدروس الأضعف بناءً على الطلب الفعلي.",
      },
      {
        stream: "تسويق ونموّ",
        title: "تحليل حملة الإطلاق + بناء قائمة بريدية",
        detail:
          "مضاعفة الجرعة على القناة الأفضل أداءً (UTM)، وبناء email capture لإعادة استهداف المتعلّمين.",
      },
    ],
  },
  {
    id: "Q4 2026",
    label: "الربع الرابع 2026",
    window: "أكتوبر – ديسمبر",
    theme: "التفاعل والاحتفاظ",
    items: [
      {
        stream: "هندسة ومنتج",
        title: "بيئات برمجية تفاعلية (Sandboxes) داخل الدروس",
        detail:
          "تمارين قابلة للتشغيل مع تحقّق تلقائي (run + test) ودعم لغات أكثر في المحرّر.",
      },
      {
        stream: "محتوى و SEO",
        title: "مسارات قائمة على المشاريع (Project-based)",
        detail:
          "مشروع متكامل لكل تخصّص يربط الدروس بنتيجة عملية، مع تحديث موسمي للمحتوى (freshness).",
      },
      {
        stream: "تسويق ونموّ",
        title: "برنامج إحالة + شراكات مجتمعية",
        detail:
          "حلقة إحالة تستفيد من مشاركة الشهادات، وشراكات مع جامعات ومجتمعات عربية.",
      },
    ],
  },
  {
    id: "Q1 2027",
    label: "الربع الأول 2027",
    window: "يناير – مارس",
    theme: "مساعد التعلّم بالذكاء الاصطناعي",
    items: [
      {
        stream: "هندسة ومنتج",
        title: "مساعد AI للتعلّم (مبني على أحدث نماذج Claude)",
        detail:
          "شرح الكود، الإجابة عن أسئلة الدرس، مراجعة حلول التمارين، وتوليد تمارين واختبارات مخصّصة.",
      },
      {
        stream: "محتوى و SEO",
        title: "مسارات جديدة عالية الطلب",
        detail:
          "إضافة تخصّصات (علم البيانات/الذكاء الاصطناعي، DevOps متقدّم) بحسب بيانات الطلب الفعلية.",
      },
      {
        stream: "تسويق ونموّ",
        title: "الذكاء الاصطناعي كعامل جذب",
        detail:
          "تسويق «تعلّم البرمجة مع مساعد ذكي بالعربي» كميزة تنافسية فريدة في السوق.",
      },
    ],
  },
  {
    id: "Q2 2027",
    label: "الربع الثاني 2027",
    window: "أبريل – يونيو",
    theme: "التوسّع والمأسسة",
    items: [
      {
        stream: "هندسة ومنتج",
        title: "باقات الفرق/الشركات (B2B) + تجربة موبايل",
        detail:
          "لوحات تقدّم للفرق وإدارة المقاعد، وتجربة موبايل متقدّمة للتعلّم في أي مكان.",
      },
      {
        stream: "محتوى و SEO",
        title: "محتوى احترافي ومسارات تخصّصية عميقة",
        detail:
          "شهادات احترافية ومحتوى متقدّم يرفع القيمة المُدرَكة ومعدّل الاحتفاظ.",
      },
      {
        stream: "تسويق ونموّ",
        title: "توسّع جغرافي وعلاقات عامة",
        detail:
          "استهداف أسواق عربية محدّدة برسائل مخصّصة، ورعاية فعاليات تقنية لبناء العلامة.",
      },
    ],
  },
];

export const ROADMAP_STREAMS: RoadmapStream[] = [
  "هندسة ومنتج",
  "محتوى و SEO",
  "تسويق ونموّ",
];

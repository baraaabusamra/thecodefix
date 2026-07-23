import "dotenv/config";
import { neon } from "@neondatabase/serverless";

// Seeds the outreach tracker with the entries from the two outreach guides
// (funding bodies + instructor candidates). Idempotent: skips names that
// already exist for the same guide, so re-running never duplicates or
// overwrites statuses/reports entered in the admin.
// Usage: node scripts/seed-outreach.mjs

const FUNDING = [
  // ── حاضنات ومسرعات (acc)
  ["acc", "Oasis500", "أول مسرعة أعمال تقنية بالأردن — تمويل أولي + تسريع + إرشاد", "https://oasis500.com"],
  ["acc", "Flat6Labs عمّان", "تمويل أولي عبر صندوق JSF + برنامج تسريع ويوم عروض للمستثمرين", "https://flat6labs.com"],
  ["acc", "iPARK", "حاضنة الجمعية العلمية الملكية — مكاتب وخدمات أعمال وربط ببرامج دعم", "https://ipark.jo"],
  ["acc", "ZINC — زين للإبداع", "مساحات عمل مجانية وبرامج تدريب ومسابقات ورعاية محتملة", "https://zinc.jo"],
  ["acc", "The Tank — أمنية", "حاضنة أمنية: احتضان وتسريع وشراكات للشركات التقنية الناشئة", "https://thetank.jo"],
  ["acc", "Orange Corners / BIG by Orange", "احتضان وتسريع بدعم أورنج للمشاريع الرقمية والشبابية", "https://orangecorners.com"],
  ["acc", "مركز الملكة رانيا للريادة (QRCE)", "تابع لجامعة الأميرة سمية — برامج دعم ومسابقات وربط بمستثمرين", "https://qrce.org"],
  ["acc", "مؤسسة ولي العهد", "برامج شبابية وريادية + تدريب ومنح وفرص تمويل", "https://cpf.jo"],
  ["acc", "Shamal Start", "حاضنة ومصنع رقمي في إربد لدعم مشاريع شمال الأردن", "https://shamalstart.com"],
  // ── جهات حكومية وصناديق (gov)
  ["gov", "ISSF — صندوق الشركات الناشئة", "صندوق وطني يستثمر بالشركات الأردنية مباشرة وعبر صناديق شريكة", "https://issfjo.com"],
  ["gov", "وزارة الاقتصاد الرقمي — برنامج نمو الأردن", "حوافز وتمويل للشركات الرقمية عبر جهات داعمة (حتى 300 ألف دينار)", "https://modee.gov.jo"],
  ["gov", "JEDCO", "برامج دعم وتمويل ومنح جزئية للمشاريع الصغيرة والناشئة", "https://jedco.gov.jo"],
  ["gov", "صندوق التنمية والتشغيل", "قروض ميسرة للمشاريع الريادية بشروط أسهل من البنوك", "https://def.gov.jo"],
  ["gov", "int@j — جمعية شركات التقنية", "عضوية تفتح فرصًا وشراكات وتعرّف على برامج الدعم أولًا بأول", "https://intaj.net"],
  // ── مستثمرون (vc)
  ["vc", "Silicon Badia", "صندوق استثمار جريء أردني للمراحل المبكرة", "https://siliconbadia.com"],
  ["vc", "Propeller (Beyond Capital)", "صندوق أردني pre-seed/seed لمؤسسي الشركات التقنية", "https://propellervc.com"],
  ["vc", "Wamda Capital", "من أبرز صناديق المنطقة + منصة ومصدر معرفي ممتاز", "https://wamda.com"],
  // ── بنوك (bank)
  ["bank", "بنك الاتحاد", "قرض شركات ناشئة حتى 250 ألف دينار بمرونة سداد", "https://bankaletihad.com"],
  ["bank", "البنك الأردني الكويتي", "برنامج تمويل مخصص للمشاريع الناشئة", "https://jkb.com"],
  ["bank", "بنك الإسكان", "قروض المشاريع الصغيرة الناشئة ويشمل قطاع IT", "https://hbtf.com"],
  // ── مسابقات ومنح (comp)
  ["comp", "MIT Enterprise Forum — مسابقة الشركات العربية", "جوائز مالية وتدريب وشبكة علاقات قوية", "https://mitefarab.org"],
  ["comp", "EBRD Star Venture", "دعم استشاري وخبراء وربط بالمستثمرين", "https://ebrd.com"],
  ["comp", "برامج GIZ الألمانية", "برامج متجددة لدعم الريادة الرقمية والتشغيل بالأردن", "https://giz.de"],
  // ── دخل مباشر (rev)
  ["rev", "Google AdSense", "إعلانات تلقائية على المقالات — الخطوة الأولى لأي موقع محتوى", "https://adsense.google.com"],
  ["rev", "Ezoic / Mediavine / Raptive", "شبكات إعلانية متقدمة بعوائد أعلى من AdSense مع نمو الزوار", "https://ezoic.com"],
  ["rev", "برامج الأفلييت التقنية", "Amazon Associates + برامج شركات البرمجيات (استضافات، أدوات، VPN)", "https://affiliate-program.amazon.com"],
  ["rev", "رعايات من شركات تقنية", "مقالات مدعومة أو ظهور بأدلة الحلول — تواصل مباشر B2B", null],
];

const INSTRUCTORS = [
  // ── محاضرون معروفون (lec)
  ["lec", "أسامة الزيرو", "Elzero Web School — أشهر معلم تطوير ويب بالعربي، جمهور ضخم", "https://elzero.org"],
  ["lec", "أحمد حسونة", "Hassouna Academy — من أقدم معلمي البرمجة بالعربي، أسلوب مبسّط", null],
  ["lec", "إسلام محفوظ", "Codezilla + مسؤول freeCodeCamp بالعربي — بايثون ومجتمع", null],
  ["lec", "عبد الرحمن جمال", "دورات شاملة بتطوير الويب بلغات متعددة", null],
  ["lec", "محمد عيسى", "Muhammed Essa — محتوى واسع: برمجة وحلول مشاكل — قريب من فكرة الموقع", null],
  ["lec", "د. محمد الدسوقي", "شرح أكاديمي لعلوم الحاسوب والخوارزميات وقواعد البيانات", null],
  ["lec", "نور حمصي", "معلم تطوير ويب ومشاريع عملية، ترتيب وتبسيط للمبتدئين", null],
  ["lec", "عادل نسيم", "Adel Nasim — دورات قوية بـ C++ وJava وOOP", null],
  ["lec", "عبد الله عيد", "من أوائل معلمي البرمجة بالعربي — C# والأساسيات", null],
  ["lec", "أحمد الإمام", "مؤسس منصة المدرسة Almdrasa — مسارات تعلم منظمة", null],
  ["lec", "إبراهيم حجازي", "من أشهر خبراء الأمن السيبراني وBug Bounty العرب", null],
  ["lec", "محمد عسكر", "مؤسس iSecur1ty — أمن معلومات بالعربي وشبكة واسعة", null],
  ["lec", "هشام عاصم", "محتوى تعلم الآلة والذكاء الاصطناعي بالعربي — لمسار AI القادم", null],
  ["lec", "أمجد مسعد", "مؤسس Replit — أردني عالمي؛ دعوة كضيف شرف تستحق المحاولة", null],
  ["lec", "أكاديمية ترميز", "Tarmeez Academy — فريق تعليم برمجة، تعاون مدربين أو شراكة محتوى", null],
  // ── الأردن: مجتمعات وجهات (jor)
  ["jor", "JOSA — جمعية المصدر المفتوح", "أكبر مجتمع تقني تطوعي بالأردن — فعالياتهم مليانة مهندسين ومتحدثين", "https://jordanopensource.org"],
  ["jor", "Orange Coding Academy", "مدربوها وخريجوها المتميزون مصدر ممتاز لمحاضرين شباب", null],
  ["jor", "جامعة الأميرة سمية (PSUT)", "أقوى جامعة تقنية بالأردن — محاضرو علوم الحاسوب", null],
  ["jor", "جامعة الحسين التقنية (HTU)", "تدريب عملي يناسب منصة أونلاين", null],
  ["jor", "الجامعة الأردنية وJUST واليرموك", "أقسام علوم الحاسوب وهندسة البرمجيات — مئات المحاضرين والمعيدين", null],
  ["jor", "إدراك Edraak", "منصة المساقات التابعة لمؤسسة الملكة رانيا — شراكة محتوى محتملة", "https://edraak.org"],
  // ── منصات تعليم عربية (plt)
  ["plt", "أكاديمية حسوب", "أكبر منظومة محتوى تقني عربي — كتابها ومدربوها بالمئات", "https://academy.hsoub.com"],
  ["plt", "برمج Barmej", "منصة كويتية لتعليم البرمجة مجانًا — نموذج قريب", "https://barmej.com"],
  ["plt", "سطر Satr", "منصة سعودية — مدربوها مرجع جيد للسوق الخليجي", "https://satr.codes"],
  ["plt", "المنتور almentor", "منصة دورات عربية كبيرة بآلاف المدربين العرب", "https://almentor.net"],
  ["plt", "رواق Rwaq", "أرشيف محاضرين أكاديميين عرب بمجالات الحاسوب", "https://rwaq.org"],
  ["plt", "مدربو Udemy العرب", "بحث Udemy عن دورات بالعربي — كل مدرب قابل لعرض تعاون", "https://www.udemy.com"],
  // ── صفحات انستغرام (ig)
  ["ig", "البوابة العربية للأخبار التقنية", "من أكبر حسابات الأخبار التقنية بالعربي — رعايات وظهور", null],
  ["ig", "عالم التقنية", "حساب أخبار ومحتوى تقني عربي واسع الانتشار", null],
  ["ig", "أراجيك AraGeek", "محتوى شبابي تقني ثقافي — جمهور قريب من المستهدف", null],
];

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const sql = neon(url);

const existing = await sql`SELECT guide, name FROM outreach_contact`;
const seen = new Set(existing.map((r) => `${r.guide}::${r.name}`));

let inserted = 0;
for (const [guide, rows] of [
  ["funding", FUNDING],
  ["instructors", INSTRUCTORS],
]) {
  for (const [category, name, description, link] of rows) {
    if (seen.has(`${guide}::${name}`)) continue;
    await sql`
      INSERT INTO outreach_contact (id, guide, category, name, description, url)
      VALUES (${crypto.randomUUID()}, ${guide}, ${category}, ${name}, ${description}, ${link})
    `;
    inserted++;
  }
}
console.log(`✓ Seeded ${inserted} outreach contacts (${seen.size} already existed).`);

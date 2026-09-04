# تغطية منهج HTML — تقرير كامل

**آخر تحديث:** 2026-09-02 · **الفرع:** `content/html-gap-fill-2026-09-01`

هذا التقرير يوثّق تدقيقًا كاملًا لمسار HTML مقابل قائمة تغطية من 84 موضوعًا (10 وحدات)، ويحدّد لكل موضوع إما: درسًا قائمًا وعنوان القسم الدقيق فيه، درسًا موسَّعًا وعنوان القسم المضاف، درسًا جديدًا، مدخلًا مرجعيًا، أو استبعادًا متعمّدًا مع السبب التعليمي. لا يُعتبر أي موضوع "مغطّى" بدون الاستشهاد بالملف والعنوان الفعليَّين.

## 1. الأعداد النهائية

| | العدد |
|---|---|
| دروس المسار الأصلية (قبل هذا العمل) | 24 |
| دروس جديدة أُضيفت | 11 (`24` إلى `34`) |
| دروس موسَّعة (بلا تغيير route) | 6 (`00`, `04`, `07`, `10`, `11`, `20`, `21`) |
| **إجمالي دروس المسار النهائي** | **35** (`00`–`22`, `24`–`34`, `23` كخاتمة بأعلى `order`) |
| دروس "مطلوبة" لاختبار الدرس + أهلية الامتحان النهائي | حسب `src/lib/quiz-requirements.ts` (كل الدروس التعليمية + 6 مشاريع، باستثناء `23-summary`) |
| مدخلات مرجعية جديدة (`src/content/reference/html.json`) | 9 (`cite`, `q`, `var`, `samp`, `u`, `s`, `noscript`, `base`, `wbr`) — إجمالي القسم الآن 77 |
| بنك أسئلة اختبار الدرس (`src/content/quiz-bank/html/lessons/*.json`) | ملف واحد لكل درس مطلوب، 5+ أسئلة لكل ملف |
| بنك الامتحان النهائي (`src/content/quiz-bank/html/exam.json`) | 80 سؤالًا مُنسَّقة، موزّعة على كل الوحدات |

## 2. جدول كل الدروس (الأصلية والنهائية)

| Order | الملف | العنوان بالعربي | الوحدة المقابلة | الحالة | اختبار درس مطلوب؟ |
|---|---|---|---|---|---|
| 0 | `00-intro.mdx` | مقدمة في HTML | 1 | **موسَّع** — أُضيف "كيف يتعامل المتصفح مع HTML؟" و"جهّز بيئة عملك" | نعم |
| 1 | `01-structure.mdx` | هيكل صفحة HTML | 1 | أصلي، بلا تغيير | نعم |
| 2 | `02-text.mdx` | النصوص: العناوين والفقرات | 2 | أصلي | نعم |
| 3 | `03-links-images.mdx` | الروابط والصور | 2/3 | أصلي (الفجوات المتقدمة ذهبت لدروس `24`/`25` منفصلة) | نعم |
| 4 | `04-lists.mdx` | القوائم | 2 | **موسَّع** — أُضيف قسم "قائمة التعريفات dl/dt/dd" | نعم |
| 5 | `05-forms.mdx` | النماذج (Forms) | 6 | أصلي | نعم |
| 6 | `06-semantic.mdx` | HTML الدلالي | 4 | أصلي (عميق أصلًا، 312 سطرًا) | نعم |
| 7 | `07-attributes.mdx` | السمات (Attributes) | 1/4 | أصلي — يغطي `lang`/`dir` كسمتين عامتين في جدول "السمات العامة" | نعم |
| 8 | `08-tables.mdx` | الجداول | 5 | أصلي — يغطي الوحدة 5 كاملة تقريبًا (`caption`, `colspan`/`rowspan`, `thead`/`tbody`/`tfoot`, قسم "الوصول a11y") | نعم |
| 9 | `09-div-classes-id.mdx` | Block/Inline وdiv/class/id | 4 | أصلي | نعم |
| 10 | `10-head-meta.mdx` | رأس المستند وhead/meta | 7 | **موسَّع** — أُضيف "Canonical URL وRobots Meta" و"مقدمة إلى Structured Data (JSON-LD)" | نعم |
| 11 | `11-forms-advanced.mdx` | النماذج المتقدمة | 6 | **موسَّع** — أُضيف: عناصر `datalist`/`meter`/`progress`/`output`، `autocomplete`/`inputmode`، رسائل أخطاء متاحة (`aria-describedby`)، وأمان النماذج | نعم |
| 12 | `12-multimedia.mdx` | الوسائط المتعددة | 3 | أصلي (الأمان المتقدم لـ iframe ذهب لدرس `25`) | نعم |
| 13 | `13-graphics.mdx` | Canvas وSVG | 3 | أصلي | نعم |
| 14 | `14-web-apis.mdx` | واجهات HTML5 البرمجية | إضافي (خارج الـ84) | أصلي | نعم |
| 15 | `15-layout-responsive.mdx` | التخطيط والتصميم المتجاوب | إضافي | أصلي | نعم |
| 16 | `16-entities-symbols.mdx` | الرموز والكيانات والترميز | إضافي | أصلي | نعم |
| 17 | `17-javascript-code.mdx` | HTML وJavaScript وعناصر الكود | 2/7 | أصلي — يغطي `script`/`noscript`/`code`/`pre`/`kbd`، ويشير لـ `defer` باختصار (التعميق في `28`) | نعم |
| 18 | `18-file-paths.mdx` | مسارات الملفات | 1 | أصلي | نعم |
| 19 | `19-formatting-colors.mdx` | التنسيق والألوان والاقتباسات | 2 | أصلي — يغطي `q`/`abbr`/`blockquote`/التعليقات فعليًا | نعم |
| 20 | `20-style-guide.mdx` | دليل الأسلوب وأفضل الممارسات | 9 | **موسَّع** — أُضيف "التحقق من HTML عبر HTML Validator" و"عناصر وخصائص قديمة (Deprecated)" | نعم |
| 21 | `21-accessibility.mdx` | إمكانية الوصول | 8 | **موسَّع** — أُضيف رابط تعمّق لدرس `26` الجديد | نعم |
| 22 | `22-search-dirname.mdx` | عنصر search وخاصية dirname | إضافي (حديث) | أصلي | نعم |
| 24 | `24-responsive-images-performance.mdx` | الصور المتجاوبة والأداء | 3 | **جديد** — `srcset`/`sizes`/`picture`/`loading=lazy`/أبعاد الصورة وCLS | نعم |
| 25 | `25-links-embeds-security.mdx` | أمان الروابط والمحتوى المضمّن | 2/3/9 | **جديد** — `rel=noopener`، `iframe sandbox`، مقدمة حقن HTML/XSS | نعم |
| 26 | `26-accessibility-deep.mdx` | إمكانية الوصول المتقدمة | 8 | **جديد** — ترتيب التركيز/Tab، الاسم الوصولي، تعدد المعالم، ARIA مقابل الدلالي | نعم |
| 27 | `27-interactive-elements.mdx` | عناصر HTML تفاعلية حديثة | 4/9 | **جديد** — `dialog`، `details`/`summary`، `popover` (مع تحذير دعم المتصفحات) | نعم |
| 28 | `28-performance-devtools.mdx` | أداء HTML وأدوات المطوّر | 9 | **جديد** — Core Web Vitals، ترتيب تحميل الموارد، `defer`/`async`، DevTools، اختبار حقيقي | نعم |
| 29 | `29-project-resume.mdx` | مشروع: سيرة ذاتية دلالية | 10 | **جديد (مشروع)** | نعم |
| 30 | `30-project-article-seo.mdx` | مشروع: مقال متاح لمحركات البحث | 10 | **جديد (مشروع)** | نعم |
| 31 | `31-project-accessible-table.mdx` | مشروع: جدول بيانات متاح | 10 | **جديد (مشروع)** | نعم |
| 32 | `32-project-registration-form.mdx` | مشروع: نموذج تسجيل كامل | 10 | **جديد (مشروع)** | نعم |
| 33 | `33-project-responsive-multisection.mdx` | مشروع: صفحة متعددة الأقسام متجاوبة | 10 | **جديد (مشروع)** | نعم |
| 34 | `34-project-capstone.mdx` | المشروع النهائي: موقع HTML متكامل | 10 | **جديد (مشروع، ختامي)** | نعم |
| 35 (order) | `23-summary.mdx` | الخلاصة وما بعد HTML | — | order فقط تغيّر (23→26→35) ليبقى الأعلى؛ لا محتوى قابل للاختبار | **لا** — مستبعد عمدًا |

> ملاحظة على الترقيم: أسماء الملفات (`24-`, `25-`...) لا تطابق أرقام `order` بالضرورة على طول القائمة (`23-summary.mdx` بقي اسمه رغم أن `order` أصبح 35) — هذا متعمّد لتفادي أي تغيير route يحتاج تحويل 301 (`docs/seo-technical-policy.md` §12)، لأن الـ slug مبني من اسم الملف الكامل لا من رقم `order` (`src/lib/content.ts`).

## 3. مطابقة قائمة الـ84 موضوعًا الأصلية

### الوحدة 1 — أساسيات HTML
1. مقدمة + كيف يعمل المتصفح → `00-intro.mdx` § "ما هي HTML؟" + § "كيف يتعامل المتصفح مع HTML؟" (موسَّع)
2. بيئة العمل وأول صفحة → `00-intro.mdx` § "جهّز بيئة عملك" (موسَّع)
3. DOCTYPE/html/head/body → `01-structure.mdx` (كامل)
4. عناصر ووسوم وسمات وتداخل → `07-attributes.mdx` (سمات) + `01-structure.mdx` (تداخل أساسي)
5. تعليقات ومسافات وقواعد كتابة → `19-formatting-colors.mdx` § "التعليقات" + `20-style-guide.mdx` (قواعد الكتابة كاملة)
6. مسارات الملفات → `18-file-paths.mdx` (كامل)

### الوحدة 2 — النصوص والمحتوى
7. عناوين وفقرات → `02-text.mdx`
8. تنسيق دلالي للنصوص → `19-formatting-colors.mdx`
9. اقتباسات ومراجع واختصارات → `19-formatting-colors.mdx` § "الاقتباسات" (يغطي `blockquote`/`q`/`abbr` فعليًا)
10. عرض الكود code/pre → `17-javascript-code.mdx` § "عرض الكود البرمجي"
11. الروابط وأنواعها → `03-links-images.mdx` § "الروابط"
12. خصائص الروابط الأمنية rel="noopener" → `25-links-embeds-security.mdx` § "`target=\"_blank\"` بحاجة إلى `rel=\"noopener\"`" (جديد)
13. قوائم مرتبة/غير مرتبة/تعريف → `04-lists.mdx` (موسَّع بقسم `dl`)
14. figure/figcaption → مغطّى ضمن مشاريع `30`/`24`؛ مرجع مستقل `/reference/html/figure`

### الوحدة 3 — الصور والوسائط
15. إضافة الصور والنص البديل → `03-links-images.mdx` § "الصور"
16. أبعاد الصور والتحميل الكسول → `24-responsive-images-performance.mdx` § "أبعاد الصورة تمنع قفزة التخطيط" + § "التحميل الكسول" (جديد)
17. srcset/picture/sizes → `24-responsive-images-performance.mdx` (جديد بالكامل)
18. الصوت audio → `12-multimedia.mdx` § "الصوت"
19. الفيديو وtrack → `12-multimedia.mdx` § "الفيديو" (عنصر `track` بمرجع `/reference/html/track` فقط — انظر القسم 5 أدناه)
20. تضمين iframe → `12-multimedia.mdx` § "الإطار"
21. أمان iframe (sandbox/allow/referrerpolicy) → `25-links-embeds-security.mdx` § "تضمين محتوى لا تثق به تمامًا" (جديد)
22. SVG وCanvas → `13-graphics.mdx` (كامل)

### الوحدة 4 — البنية وHTML الدلالي
23. div/span مقابل الدلالي → `09-div-classes-id.mdx`
24. تخطيط دلالي header/nav/main/footer → `06-semantic.mdx`
25. section/article/aside → `06-semantic.mdx`
26. address/time/mark/details/summary → `mark`/`time` في `19-formatting-colors.mdx`؛ `details`/`summary` في `27-interactive-elements.mdx` (جديد)؛ `address` مستخدَم عمليًا في مشاريع `30`/`34`
27. السمات العامة id/class/title/data-* → `07-attributes.mdx`
28. hidden/inert/tabindex/contenteditable → `tabindex` مغطّى بعمق في `26-accessibility-deep.mdx`؛ `hidden` في جدول `07-attributes.mdx`؛ **`inert`/`contenteditable` غير مغطّيين بلا مرجع أيضًا — فجوة متبقية، انظر القسم 6**
29. تنظيم مشروع متعدد الصفحات → `34-project-capstone.mdx` (جديد، تطبيق عملي كامل)

### الوحدة 5 — الجداول
30-34. table/caption/colspan/rowspan/thead/tbody/a11y/أخطاء شائعة → `08-tables.mdx` (مغطّاة بالكامل أصلًا) + `31-project-accessible-table.mdx` (تطبيق عملي جديد)

### الوحدة 6 — النماذج
35-41. form/label/input types/textarea/select/buttons/fieldset/required-pattern-min-max → `05-forms.mdx` + `11-forms-advanced.mdx`
42. autocomplete/inputmode → `11-forms-advanced.mdx` § "`autocomplete` و`inputmode`" (موسَّع)
43. رفع الملفات → `11-forms-advanced.mdx` § "أنواع حقل input" (`type="file"` مذكور أصلًا)
44. datalist/meter/progress/output → `11-forms-advanced.mdx` § "عناصر إخراج ونتائج" (موسَّع)
45. الوصول في النماذج ورسائل الأخطاء → `11-forms-advanced.mdx` § "رسائل أخطاء متاحة للوصول" (موسَّع)
46. أمان النماذج → `11-forms-advanced.mdx` § "أمان النماذج: ما لا يحميه HTML وحده" (موسَّع) + `32-project-registration-form.mdx`

### الوحدة 7 — الرأس والبيانات الوصفية وSEO
47-52. head/UTF-8/viewport/title/description/canonical/robots/favicon/OG → `10-head-meta.mdx` (كامل، Canonical/Robots موسَّعان حديثًا)
53. JSON-LD → `10-head-meta.mdx` § "مقدمة إلى Structured Data (JSON-LD)" (موسَّع)
54. lang/dir → `07-attributes.mdx` (السمات العامة) + `22-search-dirname.mdx` (`dirname` تحديدًا)
55-56. تحميل CSS/JS (link/script/defer/async) → `10-head-meta.mdx` (link) + `17-javascript-code.mdx` (defer) + `28-performance-devtools.mdx` (تعميق defer/async، جديد)
57. noscript → `17-javascript-code.mdx`
58. Preload/preconnect/resource hints → `28-performance-devtools.mdx` § "ترتيب تحميل الموارد" (جديد)

### الوحدة 8 — إمكانية الوصول
59-68. مقدمة a11y/دلالي بدل ARIA/تسلسل عناوين/لوحة مفاتيح/focus/alt/accessible names/landmarks/ARIA/أخطاء شائعة → `21-accessibility.mdx` (أساسي) + `26-accessibility-deep.mdx` (تعميق كامل: focus order, accessible name, landmarks متعددة, ARIA مقابل الدلالي — جديد)

### الوحدة 9 — الأمان والجودة والأداء
69. أخطاء HTML شائعة → `20-style-guide.mdx` § "الأخطاء الشائعة"
70. HTML Validator → `20-style-guide.mdx` § "التحقق من HTML عبر HTML Validator" (موسَّع)
71. عناصر/خصائص Deprecated → `20-style-guide.mdx` § "عناصر وخصائص قديمة" (موسَّع)
72. أساسيات حماية الروابط والتضمينات → `25-links-embeds-security.mdx` (جديد بالكامل)
73. مخاطر حقن HTML غير الموثوق → `25-links-embeds-security.mdx` § "أخطر ثغرة تصنعها بنفسك" (جديد)
74-75. تحسين الأداء + الصور وCore Web Vitals → `24-responsive-images-performance.mdx` (صور) + `28-performance-devtools.mdx` § "Core Web Vitals من زاوية HTML" (جديد)
76. ترتيب تحميل الموارد → `28-performance-devtools.mdx` (جديد)
77. أدوات المطوّر لفحص HTML → `28-performance-devtools.mdx` § "أدوات المطوّر" (جديد)
78. اختبار الهاتف وقارئات الشاشة → `28-performance-devtools.mdx` § "اختبار الجوال وقارئ الشاشة فعليًا" (جديد)

### الوحدة 10 — المشاريع العملية
79-84. الستة مشاريع (سيرة ذاتية/مقال/جدول/نموذج تسجيل/متعدد أقسام/نهائي) → `29` إلى `34` (جديدة بالكامل)، كل واحد بالبنية السبعية الكاملة: المتطلبات، نقطة البداية، البنية المتوقعة، متطلبات الوصول، قائمة تحقق، معايير الإتمام، إرشادات الحل.

## 4. مواضيع مُستبعَدة عمدًا (مع السبب)

| الموضوع | السبب |
|---|---|
| `inert` كخاصية مستقلة | ميزة حديثة نسبيًا ومحدودة الاستخدام العملي حتى الآن؛ لا تستحق درسًا أو حتى فقرة كاملة بمعزل — أُجّلت لمراجعة بشرية لاحقة إن ظهرت حاجة تعليمية واضحة |
| `contenteditable` | خارج نطاق تعلّم HTML الأساسي؛ استخدامه الحقيقي دائمًا مقترن بجافاسكريبت لبناء محرر نصوص، فهو أقرب لموضوع تطبيقي متقدم من موضوع HTML بحت |
| عنصر `<map>`/`<area>` (خرائط الصور) | ميزة قديمة نادرة الاستخدام اليوم؛ مغطّاة بديلًا بمصادر خارجية (خرائط تفاعلية عبر `iframe`) في `12-multimedia.mdx` |
| `<object>`/`<embed>`/`<param>` كموضوع تعليمي مستقل | مذكورة صراحة في `12-multimedia.mdx` كتقنية قديمة (Flash-era) بلا تفصيل أعمق — القرار متعمّد، التفصيل لا يخدم متعلمًا اليوم |
| Popover API كموضوع كامل مستقل | أُدرِج كقسم فرعي مختصر ومُحاط بتحذير دعم صريح داخل `27-interactive-elements.mdx` بدل درس مستقل — الميزة حديثة ولا تستحق وزنًا تعليميًا أكبر بعد |
| صفحات مرجعية جديدة لـ `caption`/`colgroup`/`optgroup`/`dt`/`dd` | تتبع نمط الموقع القائم فعليًا في `src/content/reference/html.json`: عناصر فرعية لا معنى لها بمعزل عن أبيها تُشرح ضمن مدخل الأب (`table`, `select`, `dl`) لا كمدخل مستقل — إضافتها كانت ستكرر بنيويًا مع مدخلات موجودة أصلًا |

## 5. فجوات متبقية (للمراجعة البشرية، لم تُلمس هنا)

- **`inert`/`contenteditable`**: مذكورة أعلاه كاستبعاد متعمّد لهذه المرحلة، لا كسهو.
- **`<track>` (ترجمة/تعليق الفيديو)**: مدخل مرجعي موجود، بلا فقرة تعليمية متخصصة ضمن أي درس (يُذكر ضمنيًا فقط في `12-multimedia.mdx`).
- **اختبار حقيقي متعدد المتصفحات (Cross-browser testing)**: مذكور بشكل عملي في `28-performance-devtools.mdx` كنصيحة، بلا درس متخصص بأدوات مثل BrowserStack — خارج نطاق منهج HTML الأساسي عمدًا.

## 6. حالة اختبار الدرس والامتحان النهائي

- **قائمة الدروس "المطلوبة" الرسمية**: `src/lib/quiz-requirements.ts` — كل الدروس التعليمية (`00`–`22`, `24`–`28`) + المشاريع الستة (`29`–`34`) = **34 درسًا مطلوبًا**. `23-summary` مستبعد وحده (لا محتوى قابل للاختبار).
- **اختبار كل درس مطلوب**: 5 أسئلة يختارها الخادم من بنك خاص بكل درس (`src/content/quiz-bank/html/lessons/<slug>.json`)، تحتاج 4/5 للنجاح — التفاصيل الأمنية الكاملة في تقرير التسليم النهائي (خارج هذا الملف).
- **أهلية الامتحان النهائي**: تتطلب اجتياز اختبار كل الدروس الـ34 المطلوبة (يُفحص خادميًا في `src/app/quiz/[tech]/exam-actions.ts` عبر `getExamEligibility`).
- **بنك الامتحان النهائي**: `src/content/quiz-bank/html/exam.json`، 80 سؤالًا موزّعة على الوحدات العشر.

## 7. مراجع تم استخدامها للتحقق

WHATWG HTML Living Standard (`https://html.spec.whatwg.org`) · MDN Web Docs HTML Reference (`https://developer.mozilla.org/en-US/docs/Web/HTML`) · W3C WAI/WCAG · Google Search Central (canonical/robots) · schema.org · web.dev (Core Web Vitals) · OWASP (XSS/Tabnabbing). روابط محددة لكل ادعاء تقني موجودة داخل الدروس نفسها كروابط خارجية مباشرة حيث كان ذلك طبيعيًا.

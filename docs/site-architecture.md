# 🌳 هيكل موقع The Code Fix — الخريطة المعمارية

> وثيقة مرجعية لبنية الموقع والربط الداخلي وطبقة SEO ورحلة الزائر.
> آخر تحديث: **2026-07-08** (بعد دفعة الصفحات المحورية + تواريخ الدروس + عنقود الأخطاء).
> GitHub يعرض مخططات Mermaid أدناه تلقائيًا. الأرقام الحية: 929 رابطًا في sitemap.

---

## 1) الشجرة الكاملة: من الجذر إلى الأوراق

```mermaid
flowchart TD
    G["🔍 Google / محركات البحث<br/>تدخل عبر robots.txt + sitemap (929 رابطًا)"]
    HOME["🏠 الرئيسية /<br/>Organization + WebSite + FAQPage"]

    G --> HOME

    HOME --> LEARN["📚 /learn — فهرس المسارات"]
    HOME --> BLOG["📖 /blog — المدوّنة (35 مقالًا)"]
    HOME --> RM["🗺️ /roadmaps — 9 خرائط مهنية"]
    HOME --> JOBS["💼 /jobs + /training/(country)<br/>JobPosting — أول مغناطيس عضوي"]
    HOME --> PG["⚡ /playground — محرر JS/HTML/Python"]

    LEARN --> HUB["⭐ /learn/(tech) × 31<br/>الصفحات المحورية (Pillar Hubs)<br/>Course JSON-LD"]

    HUB -->|"قائمة الدروس + التقدّم"| LESSONS["📄 الدروس × 768<br/>/learn/(tech)/(lesson)<br/>LearningResource + dateModified<br/>+ آخر تحديث ظاهر + صورة OG"]
    HUB -->|"«أين يقع المسار في رحلتك؟»"| RM
    HUB -->|"«مقالات عن المسار»<br/>getPostsForTrack"| BLOG
    HUB -->|"«كن معتمدًا»"| QUIZ["📝 /quiz/(tech) × 31<br/>نجاح ≥ 60%"]

    RM -->|"خطوات الخريطة تشير للمسارات"| HUB

    BLOG --> COMP["مقالات المقارنة × 19<br/>«الفرق بين X و Y»"]
    BLOG --> ERR["🔥 عنقود الأخطاء × 9<br/>SyntaxError · NPE · Merge Conflict…"]
    BLOG --> CAREER["مقالات مهنية<br/>من أين أبدأ · الرواتب · المقابلات"]
    COMP -->|"روابط داخل النص + اقرأ أيضًا"| HUB
    ERR -->|"روابط داخل النص + اقرأ أيضًا"| HUB

    QUIZ --> CERT["🏆 /certificate/(tech)<br/>شهادة برقم فريد (noindex)"]
    CERT --> VERIFY["✅ /verify — تحقق علني<br/>(يشاركها حامل الشهادة)"]

    style HUB fill:#7c5cff,color:#fff
    style ERR fill:#b45309,color:#fff
    style G fill:#0d8a4f,color:#fff
```

**قراءة المخطط:** الصفحات المحورية (البنفسجية) هي مفترق الطرق — كل مسار يجمع
دروسه + خرائطه + مقالاته + اختباره بروابط وصفية في الاتجاهين. هذا يجعل الـ431
صفحة المفهرسة جسورًا تقود زاحف جوجل إلى الـ371 المنتظرة.

## 2) طبقة SEO — ماذا يقرأ جوجل فوق كل قالب؟

```mermaid
flowchart LR
    subgraph L["يُحقن من layout.tsx في كل صفحة"]
        ORG["Organization +<br/>EducationalOrganization"]
        WS["WebSite +<br/>SearchAction"]
    end
    subgraph P["لكل قالب صفحة"]
        HOME2["الرئيسية → FAQPage"]
        TR["صفحة مسار → Course"]
        LS["درس → LearningResource<br/>+ dateModified (من git)"]
        BP["مقال → BlogPosting +<br/>FAQPage + dateModified"]
        JB["وظيفة → JobPosting"]
        ALL["كل الصفحات → BreadcrumbList<br/>+ canonical + keywords"]
    end
    L --- P
```

- **noindex** مقصود على: `/account`، `/login`، `/certificate/*` (صفحات شخصية)، `/search`.
- تواريخ الدروس تُولَّد من git بأمر `npm run dates:generate` → `src/content/lesson-dates.json`.
- تدقيق 2026-07-08: SEO **100/100** على كل القوالب، وكل كتل JSON-LD تُقرأ بلا أخطاء.

## 3) رحلة الزائر ونظام المستخدم (OAuth في الإنتاج)

```mermaid
flowchart LR
    A["🔍 بحث:<br/>«حل خطأ …»"] --> B["مقال عنقود الأخطاء"]
    B -->|"روابط المسار"| C["صفحة المسار المحورية"]
    C --> D["الدروس<br/>(تقدّم في localStorage)"]
    D --> E["الاختبار ≥ 60%"]
    E --> F["🔐 لحظة الدخول:<br/>Google OAuth (Production) أو GitHub<br/>«سجّل لحفظ شهادتك»"]
    F --> G2["🏆 الشهادة تُصدر في DB<br/>+ مزامنة التقدّم user_progress"]
    G2 --> H["مشاركة /verify<br/>(تسويق ذاتي)"]
    H --> I["🔁 عودة عبر /account:<br/>أكمل من حيث توقفت"]
```

نقطة الدخول التحويلية: **بعد النجاح بالاختبار** (SignInToSaveCert) — أعلى لحظة
حافز. الدخول متاح للجمهور منذ 2026-07-08 (شاشة موافقة Google في Production).

## 4) خارج الشجرة (مساندة)

| المنطقة | الدور |
|---------|-------|
| `/admin/*` (8 أقسام + عمليات) | إدارة المحتوى/المستخدمين/SEO — محجوبة robots + RBAC |
| `/api/*` | auth، checkout، webhook، صور OG — محجوبة robots |
| `/about`، `/contact`، `/pricing`، `/privacy`، `/terms` | صفحات ثقة (تظهر ببحث العلامة) |
| `/search` | بحث فوري — noindex |

> **صيانة الوثيقة:** حدّث الأرقام (المسارات/الدروس/المقالات) عند كل دفعة محتوى
> كبيرة، وأضف أي قسم جديد إلى المخطط الأول.

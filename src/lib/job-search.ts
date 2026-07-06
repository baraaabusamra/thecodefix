// Smart job-search launcher: per-country pages that deep-link into pre-built
// searches on the engines that actually index programming jobs in the Arab
// world (Google Jobs, LinkedIn, Bayt, …). No aggregation API is involved —
// links open the source site with country + specialty + mode already applied.
// Client-safe module (no node imports): the specialty filter runs in the
// browser. Designed so a real aggregator (e.g. Jooble) can be layered on top
// later without changing pages: the country/specialty model stays the same.

export type Country = {
  slug: string; // URL segment: /jobs/<slug> and /training/<slug>
  nameAr: string;
  nameEn: string; // used for LinkedIn location + English queries
  flag: string;
  bayt?: string; // bayt.com country path; omitted → "international" search
};

// `remote` is a pseudo-country: link builders branch on it (remote boards
// instead of location filters). Curated job JSON slugs must never collide
// with these slugs — /jobs/[slug] resolves countries first.
export const COUNTRIES: Country[] = [
  { slug: "remote", nameAr: "عن بُعد", nameEn: "Remote", flag: "🌍" },
  { slug: "jordan", nameAr: "الأردن", nameEn: "Jordan", flag: "🇯🇴", bayt: "jordan" },
  { slug: "palestine", nameAr: "فلسطين", nameEn: "Palestine", flag: "🇵🇸" },
  { slug: "saudi-arabia", nameAr: "السعودية", nameEn: "Saudi Arabia", flag: "🇸🇦", bayt: "saudi-arabia" },
  { slug: "uae", nameAr: "الإمارات", nameEn: "United Arab Emirates", flag: "🇦🇪", bayt: "uae" },
  { slug: "egypt", nameAr: "مصر", nameEn: "Egypt", flag: "🇪🇬", bayt: "egypt" },
  { slug: "qatar", nameAr: "قطر", nameEn: "Qatar", flag: "🇶🇦", bayt: "qatar" },
  { slug: "kuwait", nameAr: "الكويت", nameEn: "Kuwait", flag: "🇰🇼", bayt: "kuwait" },
  { slug: "bahrain", nameAr: "البحرين", nameEn: "Bahrain", flag: "🇧🇭", bayt: "bahrain" },
  { slug: "oman", nameAr: "عُمان", nameEn: "Oman", flag: "🇴🇲", bayt: "oman" },
  { slug: "iraq", nameAr: "العراق", nameEn: "Iraq", flag: "🇮🇶", bayt: "iraq" },
  { slug: "lebanon", nameAr: "لبنان", nameEn: "Lebanon", flag: "🇱🇧", bayt: "lebanon" },
  { slug: "syria", nameAr: "سوريا", nameEn: "Syria", flag: "🇸🇾" },
  { slug: "yemen", nameAr: "اليمن", nameEn: "Yemen", flag: "🇾🇪" },
  { slug: "libya", nameAr: "ليبيا", nameEn: "Libya", flag: "🇱🇾" },
  { slug: "sudan", nameAr: "السودان", nameEn: "Sudan", flag: "🇸🇩" },
  { slug: "tunisia", nameAr: "تونس", nameEn: "Tunisia", flag: "🇹🇳", bayt: "tunisia" },
  { slug: "algeria", nameAr: "الجزائر", nameEn: "Algeria", flag: "🇩🇿", bayt: "algeria" },
  { slug: "morocco", nameAr: "المغرب", nameEn: "Morocco", flag: "🇲🇦", bayt: "morocco" },
  { slug: "mauritania", nameAr: "موريتانيا", nameEn: "Mauritania", flag: "🇲🇷" },
];

export function getCountry(slug: string): Country | null {
  return COUNTRIES.find((c) => c.slug === slug) ?? null;
}

export type Specialty = {
  slug: string;
  labelAr: string;
  queryAr: string; // Arabic query for Google/Bayt
  queryEn: string; // English query for LinkedIn/Wuzzuf
  remoteokTag: string; // remoteok.com/remote-<tag>-jobs
};

export const SPECIALTIES: Specialty[] = [
  { slug: "general", labelAr: "الكل", queryAr: "مبرمج", queryEn: "software developer", remoteokTag: "dev" },
  { slug: "frontend", labelAr: "فرونت إند", queryAr: "مطور واجهات أمامية", queryEn: "frontend developer", remoteokTag: "front-end" },
  { slug: "backend", labelAr: "باك إند", queryAr: "مطور باك اند", queryEn: "backend developer", remoteokTag: "backend" },
  { slug: "fullstack", labelAr: "فل ستاك", queryAr: "مطور ويب فل ستاك", queryEn: "full stack developer", remoteokTag: "full-stack" },
  { slug: "mobile", labelAr: "موبايل", queryAr: "مطور تطبيقات موبايل", queryEn: "mobile developer", remoteokTag: "mobile" },
  { slug: "python", labelAr: "بايثون", queryAr: "مطور بايثون", queryEn: "python developer", remoteokTag: "python" },
  { slug: "data", labelAr: "بيانات و AI", queryAr: "محلل بيانات", queryEn: "data analyst", remoteokTag: "data" },
  { slug: "devops", labelAr: "DevOps", queryAr: "مهندس DevOps", queryEn: "devops engineer", remoteokTag: "devops" },
  { slug: "qa", labelAr: "اختبار QA", queryAr: "مهندس اختبار برمجيات", queryEn: "qa engineer", remoteokTag: "qa" },
  { slug: "design", labelAr: "UI/UX", queryAr: "مصمم UI UX", queryEn: "ui ux designer", remoteokTag: "design" },
];

export type SearchMode = "jobs" | "training";

export type SearchLink = {
  name: string;
  desc: string; // one-line Arabic description shown on the card
  url: string;
};

const enc = encodeURIComponent;

/** Pre-built search links for a country + specialty + mode, best source first. */
export function buildSearchLinks(
  country: Country,
  specialty: Specialty,
  mode: SearchMode
): SearchLink[] {
  const training = mode === "training";
  const remote = country.slug === "remote";

  const googleQ = remote
    ? `${training ? "تدريب" : "وظائف"} ${specialty.queryAr} عن بعد`
    : `${training ? "تدريب" : "وظائف"} ${specialty.queryAr} في ${country.nameAr}`;
  const linkedinKw = training ? `${specialty.queryEn} intern` : specialty.queryEn;

  const links: SearchLink[] = [
    {
      name: "Google Jobs",
      desc: "الأشمل — يجمع الإعلانات من معظم مواقع التوظيف ومواقع الشركات نفسها.",
      url: `https://www.google.com/search?q=${enc(googleQ)}&ibp=htl;jobs&hl=ar`,
    },
    {
      name: "LinkedIn",
      desc: training
        ? "فرص التدريب على أكبر شبكة مهنية — فعّلنا لك فلتر Internship مسبقًا."
        : "أكبر شبكة مهنية — الشركات العالمية والإقليمية تنشر هنا أولًا.",
      url:
        `https://www.linkedin.com/jobs/search/?keywords=${enc(linkedinKw)}` +
        (remote ? "&f_WT=2" : `&location=${enc(country.nameEn)}`) +
        (training ? "&f_E=1" : ""),
    },
  ];

  if (!remote) {
    links.push({
      name: "بيت.كوم",
      desc: "أكبر موقع توظيف عربي — قوي في الخليج ومصر وبلاد الشام.",
      url: `https://www.bayt.com/ar/${country.bayt ?? "international"}/jobs/?text=${enc(
        training ? `تدريب ${specialty.queryAr}` : specialty.queryAr
      )}`,
    });
  }

  if (country.slug === "egypt") {
    links.push({
      name: "Wuzzuf",
      desc: "المرجع الأول للوظائف التقنية في مصر.",
      url: `https://wuzzuf.net/search/jobs/?q=${enc(training ? `${specialty.queryEn} intern` : specialty.queryEn)}`,
    });
  }

  if (remote) {
    links.push(
      {
        name: "RemoteOK",
        desc: "لوحة وظائف عن بُعد عالمية — رواتب معلنة بالدولار غالبًا.",
        url: `https://remoteok.com/remote-${specialty.remoteokTag}-jobs`,
      },
      {
        name: "We Work Remotely",
        desc: "من أقدم وأكبر لوحات العمل عن بُعد في البرمجة.",
        url: "https://weworkremotely.com/categories/remote-programming-jobs",
      },
      {
        name: "Remotive",
        desc: "وظائف تطوير برمجيات عن بُعد مع تصنيفات واضحة.",
        url: "https://remotive.com/remote-jobs/software-dev",
      }
    );
  }

  return links;
}

// Shared SEO keyword helpers.
//
// Note: Google no longer uses the <meta name="keywords"> tag as a ranking
// signal — the real ranking work is done by page titles, descriptions, headings
// and JSON-LD (all handled elsewhere). We still emit a focused keyword list per
// page because it is harmless, documents intent, and some regional/secondary
// search engines and internal tools still read it. Keep lists short and honest
// (no keyword stuffing) — a handful of high-intent Arabic phrases per page.

// Site-wide keywords that fit almost any page (kept short on purpose).
export const BASE_KEYWORDS = [
  "تعلم البرمجة بالعربي",
  "تعلم البرمجة من الصفر",
  "كورسات برمجة مجانية",
  "The Code Fix",
];

// Build a per-track keyword cluster from the track's display title.
// Mirrors the "per-language cluster" template in docs/seo-keywords.md:
//   تعلم {X} بالعربي · {X} من الصفر · شرح {X} · كورس {X} · {X} للمبتدئين ...
export function trackKeywords(title: string): string[] {
  return [
    `تعلم ${title} بالعربي`,
    `${title} من الصفر`,
    `شرح ${title}`,
    `كورس ${title}`,
    `دورة ${title}`,
    `${title} للمبتدئين`,
    `أساسيات ${title}`,
    `تعلم ${title}`,
  ];
}

// Keywords for a single lesson: the lesson's own keywords (if any) first, then
// the track cluster, de-duplicated. Used to enrich lesson metadata beyond the
// author-supplied frontmatter keywords.
export function lessonKeywords(
  trackTitle: string,
  lessonTitle: string,
  frontmatter?: string[]
): string[] {
  const out = new Set<string>();
  for (const k of frontmatter ?? []) out.add(k);
  out.add(`${lessonTitle} بالعربي`);
  out.add(`شرح ${lessonTitle}`);
  for (const k of trackKeywords(trackTitle)) out.add(k);
  return [...out];
}

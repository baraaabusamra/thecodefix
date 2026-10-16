import { isOfficialDomain } from "./domain";

// Type matching the enum generated in schema
export type SourceCategory = "official_program_page" | "official_curriculum_page" | "official_pdf" | "official_course_catalog" | "official_department_page" | "official_handbook" | "official_document" | "fallback_external";

export interface RankedSource {
  url: string;
  title: string;
  category: SourceCategory;
  score: number;
  isOfficialDomain: boolean;
  reason: string;
}

// Generic academic words that appear in almost every program name and so
// carry no discriminating power ("Bachelor of Science in X Engineering"
// shares "bachelor"/"science"/"engineering" with completely unrelated
// programs). Stripping them leaves the word(s) that actually identify the
// subject — "computer", "software", "dentistry", "chemical", etc.
const GENERIC_PROGRAM_WORDS = new Set([
  "of", "in", "and", "the", "for", "a", "an", "bachelor", "master", "masters",
  "doctor", "doctorate", "phd", "science", "sciences", "engineering", "engineer",
  "technology", "program", "programme", "degree", "studies", "study", "department",
  "college", "faculty", "university", "institute", "school", "curriculum", "plan",
  "catalog", "catalogue", "handbook", "course", "courses",
]);

function distinctiveTokens(name: string): string[] {
  return name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((tok) => tok.length > 2 && !GENERIC_PROGRAM_WORDS.has(tok));
}

export function rankSource(
  url: string,
  title: string,
  officialDomain: string | null,
  targetSpecialization?: string | null
): RankedSource {
  const lowerUrl = url.toLowerCase();
  const lowerTitle = title.toLowerCase();
  
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { url, title, category: "fallback_external", score: 0, isOfficialDomain: false, reason: "Invalid URL" };
  }

  const isOfficial = isOfficialDomain(officialDomain, parsed.hostname);

  // A PDF/page living on the official domain is not automatically curriculum
  // content — faculty CVs, publications, and personal profiles also live
  // there. Catch these before the official-domain scoring bonus applies,
  // otherwise a professor's CV can outrank (or replace) the real catalog.
  const PERSONAL_DOC_PATTERN = /\bcv\b|resume|curriculum[\s-]?vitae|\bportfolio\b/i;
  if (PERSONAL_DOC_PATTERN.test(lowerUrl) || PERSONAL_DOC_PATTERN.test(lowerTitle)) {
    return {
      url,
      title,
      category: "fallback_external",
      score: 5,
      isOfficialDomain: isOfficial,
      reason: "Likely a personal document (CV/resume/portfolio), not curriculum content",
    };
  }

  // Basic heuristic rules for categorization and scoring
  let category: SourceCategory = "fallback_external";
  let score = 50;
  let reason = "External fallback source";

  if (isOfficial) {
    category = "official_document";
    score = 75;
    reason = "Official university domain";

    if (lowerUrl.endsWith(".pdf")) {
      category = "official_pdf";
      score = 95;
      reason = "Official PDF document";
    }

    if (
      lowerUrl.includes("curriculum") || 
      lowerUrl.includes("study-plan") || 
      lowerUrl.includes("study_plan") ||
      lowerTitle.includes("خطة") ||
      lowerTitle.includes("study plan")
    ) {
      category = lowerUrl.endsWith(".pdf") ? "official_pdf" : "official_curriculum_page";
      // Same score regardless of format: a PDF is not less authoritative than
      // an HTML page of the same document type, and is often the primary
      // source (the HTML page is frequently just a landing page linking to it).
      score = 100;
      reason = "Official curriculum or study plan";
    } else if (
      lowerUrl.includes("program") || 
      lowerUrl.includes("degree") ||
      lowerTitle.includes("برنامج")
    ) {
      category = "official_program_page";
      score = 95;
      reason = "Official program page";
    } else if (
      lowerUrl.includes("catalog") || 
      lowerUrl.includes("courses") ||
      lowerTitle.includes("مقررات") ||
      lowerTitle.includes("توصيف")
    ) {
      category = "official_course_catalog";
      score = 90;
      reason = "Official course catalog";
    } else if (
      lowerUrl.includes("department") || 
      lowerUrl.includes("faculty") ||
      lowerTitle.includes("كلية")
    ) {
      category = "official_department_page";
      score = 90;
      reason = "Official department page";
    } else if (
      lowerUrl.includes("handbook") ||
      lowerTitle.includes("دليل")
    ) {
      category = "official_handbook";
      score = 85;
      reason = "Official handbook";
    }
  }

  // Being an official document says nothing about whether it's about the
  // right subject — a university's most prominent PDF can just as easily be
  // a Pediatric Dentistry catalog as a Computer Science one. If the target
  // specialization has a distinctive word and it's nowhere in the title or
  // URL, this almost certainly isn't the right document, regardless of how
  // official-looking it is.
  if (targetSpecialization) {
    const distinctive = distinctiveTokens(targetSpecialization);
    if (distinctive.length > 0) {
      const haystack = `${lowerTitle} ${lowerUrl}`;
      const matchesSpecialization = distinctive.some((tok) => haystack.includes(tok));
      if (!matchesSpecialization) {
        score = Math.min(score, 15);
        reason = `${reason} — but title/URL doesn't mention "${targetSpecialization}"`;
      }
    }
  }

  return {
    url,
    title,
    category,
    score,
    isOfficialDomain: isOfficial,
    reason
  };
}

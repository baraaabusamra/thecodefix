import { isOfficialDomain } from "./domain";
import { pipelineSourceType } from "@/db/schema";

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

export function rankSource(url: string, title: string, officialDomain: string | null): RankedSource {
  const lowerUrl = url.toLowerCase();
  const lowerTitle = title.toLowerCase();
  
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { url, title, category: "fallback_external", score: 0, isOfficialDomain: false, reason: "Invalid URL" };
  }

  const isOfficial = isOfficialDomain(officialDomain, parsed.hostname);
  
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
      score = lowerUrl.endsWith(".pdf") ? 95 : 100;
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

  return {
    url,
    title,
    category,
    score,
    isOfficialDomain: isOfficial,
    reason
  };
}

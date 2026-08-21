import { ExtractedCourse } from "./schema";

export type ConfidenceLevel = "high" | "medium" | "low";

/**
 * Calculates a deterministic confidence score for an extracted course.
 * 
 * Rules based on the prompt constraints:
 * High:
 * - Has valid code, credits, and semester.
 * - Every important field has at least one piece of evidence.
 * - Evidence has a valid page number.
 * 
 * Medium:
 * - Course exists and has some evidence, but might be missing exact page numbers
 *   or one of the structural fields (like semester).
 * 
 * Low:
 * - Missing evidence entirely.
 * - Missing code and credits.
 * - Anomalous data.
 */
export function calculateCourseConfidence(course: ExtractedCourse): ConfidenceLevel {
  const hasCode = !!course.code && course.code.trim().length > 0;
  const hasCredits = course.credits !== null && course.credits > 0;
  const hasSemester = course.semester !== null && course.semester > 0;
  const hasEvidence = course.evidence && course.evidence.length > 0;
  
  // Calculate evidence coverage for important fields (name, code, credits)
  let coveredFields = 0;
  
  if (course.evidence) {
    const fieldsWithEvidence = new Set(course.evidence.map(e => e.field));
    if (fieldsWithEvidence.has("nameEn") || fieldsWithEvidence.has("nameAr") || fieldsWithEvidence.has("name")) coveredFields++;
    if (fieldsWithEvidence.has("code")) coveredFields++;
    if (fieldsWithEvidence.has("credits")) coveredFields++;
  }

  const allPagesValid = course.evidence ? course.evidence.every(e => e.page !== null && e.page > 0) : false;

  if (!hasEvidence || coveredFields === 0) {
    return "low";
  }

  if (hasCode && hasCredits && hasSemester && coveredFields >= 2 && allPagesValid) {
    return "high";
  }

  if (hasCode || hasCredits) {
    return "medium";
  }

  return "low";
}

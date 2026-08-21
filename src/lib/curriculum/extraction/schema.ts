import { z } from "zod";

export const ExtractionEvidenceSchema = z.object({
  page: z.number().nullable(),
  quote: z.string().describe("Exact short quote from the document supporting this field"),
  field: z.string().describe("The name of the field this evidence supports (e.g. 'credits', 'prerequisite')")
});

export const ExtractedCourseSchema = z.object({
  code: z.string().nullable().describe("Official course code e.g. CS101. Do not invent if missing."),
  nameAr: z.string().nullable().describe("Course name in Arabic if available."),
  nameEn: z.string().nullable().describe("Course name in English if available. At least one name must be provided."),
  credits: z.number().nullable().describe("Total credit hours. Do not invent if missing."),
  type: z.enum([
    "university_requirement",
    "college_requirement",
    "major_requirement",
    "major_elective",
    "free_elective",
    "unknown"
  ]).describe("Category of the course in the curriculum"),
  semester: z.number().nullable().describe("Recommended semester number (1-10) if stated. Null if unknown."),
  prerequisites: z.array(z.object({
    courseCode: z.string().nullable(),
    courseName: z.string().nullable()
  })).describe("Formal prerequisites only. Do not include 'recommended' knowledge."),
  evidence: z.array(ExtractionEvidenceSchema).describe("Evidence for every non-null field extracted for this course.")
});

export const ExtractedCurriculumSchema = z.object({
  curriculum: z.object({
    title: z.string().nullable().describe("Title of the curriculum or program"),
    degree: z.string().nullable().describe("Degree type e.g. Bachelor, Master"),
    specialization: z.string().nullable().describe("Specialization/Major name"),
    academicYear: z.string().nullable().describe("Academic year or version if stated e.g. 2023-2024"),
    totalCredits: z.number().nullable().describe("Total credit hours for the entire program"),
  }),
  courses: z.array(ExtractedCourseSchema).describe("List of all courses in the curriculum"),
  document_limitations: z.string().nullable().describe("Note if the document is incomplete, missing pages, or if extraction was partial.")
});

export type ExtractedCurriculum = z.infer<typeof ExtractedCurriculumSchema>;
export type ExtractedCourse = z.infer<typeof ExtractedCourseSchema>;
export type ExtractionEvidence = z.infer<typeof ExtractionEvidenceSchema>;

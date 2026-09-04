import { GoogleGenAI, Type } from "@google/genai";
import { z } from "zod";
import {
  CurriculumExtractionProvider,
  ExtractionDocument,
  ExtractionResult,
  ProgramContext,
} from "./provider";
import { ExtractedCurriculumSchema } from "./schema";
import { buildExtractionPrompt } from "./prompt";

export class GeminiCurriculumExtractor implements CurriculumExtractionProvider {
  private ai: GoogleGenAI;
  private modelName: string;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured.");
    }
    if (!process.env.GEMINI_EXTRACTION_MODEL) {
      throw new Error("GEMINI_EXTRACTION_MODEL is not configured.");
    }
    
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    this.modelName = process.env.GEMINI_EXTRACTION_MODEL;
  }

  async extract(
    document: ExtractionDocument,
    context: ProgramContext,
    promptVersion: string
  ): Promise<ExtractionResult> {
    // The pipeline persists this version on the extraction run; the provider
    // keeps it in its public contract even though prompt assembly is shared.
    void promptVersion;
    if (!document.extractedText) {
      return {
        data: null,
        rawJson: null,
        tokenUsage: null,
        error: "NO_TEXT_IN_DOCUMENT",
      };
    }

    const systemInstruction = buildExtractionPrompt(
      context.university,
      context.specialization,
      context.degree,
      document.extractedText
    );

    try {
      const response = await this.ai.models.generateContent({
        model: this.modelName,
        contents: "Extract the curriculum as JSON.",
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1, // Deterministic
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              curriculum: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, nullable: true },
                  degree: { type: Type.STRING, nullable: true },
                  specialization: { type: Type.STRING, nullable: true },
                  academicYear: { type: Type.STRING, nullable: true },
                  totalCredits: { type: Type.NUMBER, nullable: true },
                },
                required: ["title", "degree", "specialization", "academicYear", "totalCredits"],
              },
              courses: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    code: { type: Type.STRING, nullable: true },
                    nameAr: { type: Type.STRING, nullable: true },
                    nameEn: { type: Type.STRING, nullable: true },
                    credits: { type: Type.NUMBER, nullable: true },
                    type: {
                      type: Type.STRING,
                      enum: [
                        "university_requirement",
                        "college_requirement",
                        "major_requirement",
                        "major_elective",
                        "free_elective",
                        "unknown"
                      ]
                    },
                    semester: { type: Type.NUMBER, nullable: true },
                    prerequisites: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          courseCode: { type: Type.STRING, nullable: true },
                          courseName: { type: Type.STRING, nullable: true },
                        },
                        required: ["courseCode", "courseName"],
                      },
                    },
                    evidence: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          page: { type: Type.NUMBER, nullable: true },
                          quote: { type: Type.STRING },
                          field: { type: Type.STRING },
                        },
                        required: ["page", "quote", "field"],
                      },
                    },
                  },
                  required: [
                    "code",
                    "nameAr",
                    "nameEn",
                    "credits",
                    "type",
                    "semester",
                    "prerequisites",
                    "evidence",
                  ],
                },
              },
              document_limitations: { type: Type.STRING, nullable: true },
            },
            required: ["curriculum", "courses", "document_limitations"],
          }
        }
      });

      const responseText = response.text || "";
      
      const tokenUsage = {
        input: response.usageMetadata?.promptTokenCount || 0,
        output: response.usageMetadata?.candidatesTokenCount || 0,
      };

      try {
        const rawObj = JSON.parse(responseText);
        const validatedData = ExtractedCurriculumSchema.parse(rawObj);
        return {
          data: validatedData,
          rawJson: responseText,
          tokenUsage,
          error: null,
        };
      } catch (zodError: unknown) {
        const message = zodError instanceof z.ZodError ? zodError.message : String(zodError);
        return {
          data: null,
          rawJson: responseText,
          tokenUsage,
          error: "SCHEMA_VALIDATION_FAILED: " + message,
        };
      }
    } catch (apiError: unknown) {
      const err = apiError as { status?: number; message?: string };
      let errorClass = "AI_API_ERROR";
      if (err.status === 429) errorClass = "AI_RATE_LIMIT";
      else if (err.status === 401 || err.status === 403) errorClass = "AI_AUTH_ERROR";
      else if (err.status === 404) errorClass = "AI_MODEL_UNAVAILABLE";
      else if (err.message?.toLowerCase().includes("timeout")) errorClass = "AI_TIMEOUT";

      return {
        data: null,
        rawJson: null,
        tokenUsage: null,
        error: errorClass + ": " + (err.message || JSON.stringify(apiError)),
      };
    }
  }
}
